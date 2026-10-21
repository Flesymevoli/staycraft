import asyncio
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import httpx

from app.main import app
from app.local_facts import FactStore
from app.room_service import read_board


class RoomTests(unittest.TestCase):
    def test_snapshot_status_is_derived_from_reservations_and_housekeeping(self):
        with tempfile.TemporaryDirectory() as folder:
            with closing(FactStore(Path(folder)/"rooms.sqlite3").connect()) as db:
                board = read_board(db)
                self.assertEqual(board["counts"], {"ready": 1, "cleaning": 2, "occupied": 7})
                self.assertEqual(board["snapshot_date"], "2026-09-17")
                # A confirmed arrival is not a checked-in guest.
                room = next(item for item in board["items"] if item["number"] == "102")
                self.assertEqual(room["status"], "cleaning")
                self.assertEqual(room["next_arrival"], "2026-09-17")
                self.assertEqual(db.execute("SELECT amount_cents,currency FROM demo_reservations WHERE room_number='102'").fetchone(), (104000, "CNY"))
                # Dirty but occupied remains occupied; never ready.
                db.execute("UPDATE demo_rooms SET housekeeping='dirty' WHERE number='103'")
                self.assertEqual(next(r for r in read_board(db)["items"] if r["number"] == "103")["status"], "occupied")
                # Checkout boundary and cancelled orders cannot block an empty room.
                db.execute("UPDATE demo_reservations SET check_out='2026-09-17' WHERE room_number='103'")
                self.assertEqual(next(r for r in read_board(db)["items"] if r["number"] == "103")["status"], "cleaning")
                db.execute("UPDATE demo_reservations SET status='cancelled' WHERE room_number='104'")
                self.assertEqual(next(r for r in read_board(db)["items"] if r["number"] == "104")["status"], "ready")

    def test_cleaning_persists_is_idempotent_and_preserves_orders(self):
        async def run(path):
            transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 123))
            with patch.dict(os.environ, {"HOMESTAY_LOCAL_DATA": "1", "HOMESTAY_LOCAL_DB": str(path)}):
                async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
                    original = (await client.get("/v1/local/room-board")).json()
                    with closing(FactStore(path).connect()) as db:
                        before = db.execute("SELECT * FROM demo_reservations ORDER BY id").fetchall()
                    for _ in range(2):
                        response = await client.post("/v1/local/room-clean", json={"room_number": "102"})
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.json()["counts"], {"ready": 2, "cleaning": 1, "occupied": 7})
                    self.assertEqual((await client.get("/v1/local/room-board")).json()["counts"]["ready"], 2)
                    with closing(FactStore(path).connect()) as db:
                        self.assertEqual(before, db.execute("SELECT * FROM demo_reservations ORDER BY id").fetchall())
                    self.assertEqual((await client.post("/v1/local/room-clean", json={"room_number":"103"})).status_code, 409)
                    self.assertEqual((await client.post("/v1/local/room-clean", json={"room_number":"999"})).status_code, 404)
                    self.assertEqual((await client.post("/v1/local/room-clean", json={"room_number":"102", "status":"ready"})).status_code, 422)
                    self.assertEqual((await client.get("/v1/local/room-board")).json()["counts"]["occupied"], original["counts"]["occupied"])
            with patch.dict(os.environ, {"HOMESTAY_LOCAL_DATA": "0"}):
                async with httpx.AsyncClient(transport=transport, base_url="http://localhost") as client:
                    self.assertEqual((await client.get("/v1/local/room-board")).status_code, 404)
            remote = httpx.ASGITransport(app=app, client=("10.0.0.2", 123))
            with patch.dict(os.environ, {"HOMESTAY_LOCAL_DATA": "1"}):
                async with httpx.AsyncClient(transport=remote, base_url="http://localhost") as client:
                    self.assertEqual((await client.post("/v1/local/room-clean", json={"room_number":"102"})).status_code, 404)
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(run(Path(folder)/"rooms.sqlite3"))

    def test_v5_upgrade_preserves_existing_content_and_does_not_reseed(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/"rooms.sqlite3"
            # Simulate a real v5 file before the new two tables existed.
            with closing(FactStore(path).connect()) as db:
                db.execute("INSERT INTO promotion_drafts VALUES ('preserved','Owner draft','today')")
                db.execute("DROP TABLE demo_reservations")
                db.execute("DROP TABLE demo_rooms")
                db.execute("PRAGMA user_version=5")
                db.commit()
            with closing(FactStore(path).connect()) as db:
                self.assertEqual(db.execute("SELECT content FROM promotion_drafts WHERE id='preserved'").fetchone()[0], "Owner draft")
                self.assertEqual(len(read_board(db)["items"]), 10)
                db.execute("DELETE FROM demo_reservations")
                db.execute("DELETE FROM demo_rooms")
                db.commit()
            with closing(FactStore(path).connect()) as db:
                self.assertEqual(read_board(db)["items"], [])
