import asyncio
import json
import os
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import httpx
from fastapi import HTTPException
from app.main import app
from app.local_facts import FactStore, SavedFacts
from app.local_operations import AdviceQuery, SaveDecision, local_advice, record_decision, operations
from app.room_service import CleanRoom, clean_room


class LocalOperationTests(unittest.TestCase):
    def test_arrival_uses_confirmed_time_current_cleaning_and_occupancy(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"requests.sqlite3")
            result=local_advice(AdviceQuery(id="arrival"),store)
            self.assertIn("standard_checkin",result["advice"]["missing_checks"])
            store.save(SavedFacts(checkin="15:00"))
            dirty=local_advice(AdviceQuery(id="arrival"),store)
            self.assertEqual(dirty["operation"]["guest"],"Taylor")
            self.assertIn("standard_checkin=15:00",dirty["advice"]["basis"])
            self.assertEqual(dirty["advice"]["recommended_action"],"keep_standard_time")
            clean_room(CleanRoom(room_number="102"),store)
            ready=local_advice(AdviceQuery(id="arrival"),store)
            self.assertEqual(ready["advice"]["recommended_action"],"consider_early_checkin")
            self.assertNotEqual(dirty["fingerprint"],ready["fingerprint"])
            with closing(store.connect()) as db:
                db.execute("UPDATE demo_reservations SET check_in='2026-09-18' WHERE id='demo-102'")
                db.commit()
            future=local_advice(AdviceQuery(id="arrival"),store)
            self.assertIn("cleaning_ready",future["advice"]["missing_checks"])

    def test_refund_uses_paid_amount_policy_and_order_status(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"requests.sqlite3")
            result=local_advice(AdviceQuery(id="refund"),store)
            self.assertEqual(result["operation"]["order_id"],"future-204")
            self.assertEqual(result["advice"]["suggested_refund_yuan"],1040)
            with closing(store.connect()) as db:
                db.execute("UPDATE operation_requests SET paid_cents=50001 WHERE id='refund'")
                db.commit()
            self.assertEqual(local_advice(AdviceQuery(id="refund"),store)["advice"]["suggested_refund_yuan"],500.01)
            with closing(store.connect()) as db:
                db.execute("UPDATE operation_requests SET payment_confirmed=0,full_refund_min_days=NULL WHERE id='refund'")
                db.commit()
            result=local_advice(AdviceQuery(id="refund"),store)
            self.assertEqual(set(result["advice"]["missing_checks"]),{"refund_policy","payment_confirmation"})
            self.assertIsNone(result["advice"]["suggested_refund_yuan"])
            with closing(store.connect()) as db:
                db.execute("UPDATE demo_reservations SET status='cancelled' WHERE id='future-204'")
                db.commit()
            self.assertEqual(local_advice(AdviceQuery(id="refund"),store)["advice"]["reason_code"],"order_not_active")

    def test_stale_forged_and_duplicate_plans_never_change_orders(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"requests.sqlite3")
            store.save(SavedFacts(checkin="14:00"))
            with closing(store.connect()) as db:
                before=db.execute("SELECT * FROM demo_reservations ORDER BY id").fetchall()
            old=local_advice(AdviceQuery(id="arrival"),store)
            clean_room(CleanRoom(room_number="102"),store)
            with self.assertRaises(HTTPException) as stale:
                record_decision(SaveDecision(id="arrival",decision="keep_standard",fingerprint=old["fingerprint"],request_id=uuid4()),store)
            self.assertEqual(stale.exception.status_code,409)
            current=local_advice(AdviceQuery(id="arrival"),store)
            with self.assertRaises(HTTPException):
                record_decision(SaveDecision(id="arrival",decision="refund_proposed",fingerprint=current["fingerprint"],request_id=uuid4()),store)
            request=SaveDecision(id="arrival",decision="consider_early",fingerprint=current["fingerprint"],request_id=uuid4())
            first=record_decision(request,store)
            self.assertEqual(first,record_decision(request,store))
            self.assertEqual(first["decisions"][0]["external_status"],"not_started")
            with self.assertRaises(HTTPException):
                record_decision(request.model_copy(update={"decision":"keep_standard"}),store)
            self.assertEqual(len(operations(FactStore(store.path))["decisions"]),1)
            with closing(store.connect()) as db:
                self.assertEqual(before,db.execute("SELECT * FROM demo_reservations ORDER BY id").fetchall())
                saved=json.loads(db.execute("SELECT advice_json FROM operation_decisions").fetchone()[0])
                self.assertEqual(saved["advice"]["external_status"],"not_started")

    def test_local_guards_validation_and_empty_requests(self):
        async def run(path):
            with patch.dict(os.environ,{"HOMESTAY_LOCAL_DATA":"1","HOMESTAY_LOCAL_DB":str(path)}):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=("127.0.0.1",1)),base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/operations")).status_code,200)
                    self.assertEqual((await client.post("/v1/local/operation-advice",json={"id":"arrival","room_available":True})).status_code,422)
                    self.assertEqual((await client.post("/v1/local/operation-decision",json={"id":"refund"})).status_code,422)
                    with closing(FactStore(path).connect()) as db:
                        db.execute("DELETE FROM operation_requests")
                        db.commit()
                    self.assertEqual((await client.get("/v1/local/operations")).json()["items"],[])
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=("10.0.0.1",1)),base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/operations")).status_code,404)
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(run(Path(folder)/"requests.sqlite3"))
