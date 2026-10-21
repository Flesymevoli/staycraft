import asyncio
import os
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import httpx
from app.main import app
from app.local_facts import FactStore
from app.operation_metrics import compute_metrics
from app.analysis_service import build_summary
from app.room_service import clean_room, CleanRoom


class MetricTests(unittest.TestCase):
    def test_fixture_totals_dates_and_summary_use_same_calculation(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"MODEL_ENABLED":"0"}):
            store=FactStore(Path(folder)/"orders.sqlite3")
            for days in (7,28):
                metrics=compute_metrics(store,days)
                self.assertEqual(metrics["period_end"],"2026-09-16")
                self.assertEqual(len(metrics["daily"]),days)
                self.assertEqual(metrics["capacity_room_nights"],days*10)
                self.assertEqual(metrics["occupied_room_nights"],sum(d["occupied_nights"] for d in metrics["daily"]))
                self.assertEqual(metrics["occupancy_pct"],round(metrics["occupied_room_nights"]*100/(days*10)))
                result=asyncio.run(build_summary(store,days,"en"))
                self.assertEqual(result["metrics"]["daily"],metrics["daily"])
                self.assertEqual(result["metrics"]["occupancy_pct"],metrics["occupancy_pct"])
            metrics=compute_metrics(store,7)
            self.assertEqual((metrics["occupancy_pct"],metrics["next_week_booked_nights"]),(70,32))
            self.assertIsNone(metrics["previous_booking_pace"])
            self.assertIsNone(compute_metrics(store,28)["occupancy_change_pp"])
            # Cleaning is not occupancy, so it cannot change these metrics.
            clean_room(CleanRoom(room_number="102"),store)
            self.assertEqual(compute_metrics(store,7),metrics)

    def test_cancelled_confirmed_checkout_boundaries_and_overlap(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"orders.sqlite3")
            with closing(store.connect()) as db:
                db.execute("DELETE FROM demo_reservations")
                rows=[
                    ("one","A","101","2026-09-15","2026-09-17",10000,"CNY","checked_out"),
                    ("overlap","B","101","2026-09-16","2026-09-18",10000,"CNY","checked_in"),
                    ("unarrived","C","102","2026-09-15","2026-09-17",10000,"CNY","confirmed"),
                    ("cancelled","D","103","2026-09-15","2026-09-17",10000,"CNY","cancelled"),
                    ("next","E","101","2026-09-20","2026-09-23",10000,"CNY","confirmed"),
                    ("next-overlap","F","101","2026-09-21","2026-09-24",10000,"CNY","confirmed"),
                    ("next-cancelled","G","102","2026-09-21","2026-09-28",10000,"CNY","cancelled")]
                db.executemany("INSERT INTO demo_reservations VALUES (?,?,?,?,?,?,?,?)",rows)
                db.commit()
            data=compute_metrics(store,7)
            self.assertEqual(data["occupied_room_nights"],2)
            self.assertEqual(data["next_week_booked_nights"],3)
            self.assertEqual(data["daily"][-1]["occupied_nights"],1)
            with closing(store.connect()) as db:
                db.execute("DELETE FROM demo_reservations")
                db.commit()
            self.assertEqual(compute_metrics(store,7)["occupancy_pct"],0)
            self.assertEqual(compute_metrics(store,7)["next_week_booked_nights"],0)
            with closing(store.connect()) as db:
                db.execute("DELETE FROM demo_rooms")
                db.commit()
            data=compute_metrics(store,7)
            self.assertIsNone(data["occupancy_pct"])
            self.assertEqual(data["capacity_room_nights"],0)

    def test_endpoints_local_guard_and_period_validation(self):
        async def run(path):
            with patch.dict(os.environ,{"HOMESTAY_LOCAL_DATA":"1","HOMESTAY_LOCAL_DB":str(path)}):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=("127.0.0.1",1)),base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/operation-metrics?days=28")).status_code,200)
                    self.assertEqual((await client.get("/v1/local/operation-metrics?days=2")).status_code,422)
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=("10.0.0.1",1)),base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/operation-metrics")).status_code,404)
            with patch.dict(os.environ,{"HOMESTAY_LOCAL_DATA":"0"}):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=("127.0.0.1",1)),base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/operation-metrics")).status_code,404)
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(run(Path(folder)/"orders.sqlite3"))

    def test_v6_upgrade_keeps_cleaning_and_saved_owner_data(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"orders.sqlite3")
            with closing(store.connect()) as db:
                db.execute("DELETE FROM demo_reservations WHERE id LIKE 'history-%' OR id LIKE 'future-%'")
                db.execute("UPDATE demo_rooms SET housekeeping='clean' WHERE number='102'")
                db.execute("INSERT INTO promotion_drafts VALUES ('saved','Keep me','today')")
                before=db.execute("SELECT * FROM demo_reservations ORDER BY id").fetchall()
                db.execute("PRAGMA user_version=6")
                db.commit()
            with closing(store.connect()) as db:
                self.assertEqual(db.execute("PRAGMA user_version").fetchone()[0],7)
                self.assertEqual(db.execute("SELECT housekeeping FROM demo_rooms WHERE number='102'").fetchone()[0],"clean")
                self.assertEqual(db.execute("SELECT content FROM promotion_drafts WHERE id='saved'").fetchone()[0],"Keep me")
                self.assertEqual(db.execute("SELECT * FROM demo_reservations WHERE id LIKE 'demo-%' ORDER BY id").fetchall(),before)
                count=db.execute("SELECT COUNT(*) FROM demo_reservations").fetchone()[0]
            with closing(store.connect()) as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM demo_reservations").fetchone()[0],count)
