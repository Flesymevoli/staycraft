import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from uuid import uuid4
from app.local_facts import FactStore, SavedFacts
from app.local_operations import AdviceQuery, SaveDecision, local_advice, record_decision
from app.schedule_service import schedule


class ScheduleTests(unittest.TestCase):
    def test_dates_match_orders_and_unknown_times_are_not_invented(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"dates.sqlite3")
            items=schedule(store)["items"]
            arrival=next(item for item in items if item["order_id"]=="demo-102" and item["kind"]=="checkin")
            departure=next(item for item in items if item["order_id"]=="demo-201" and item["kind"]=="checkout")
            self.assertEqual(arrival["date"],"2026-09-17")
            self.assertIsNone(arrival["time"])
            self.assertEqual(departure["date"],"2026-09-17")
            self.assertIsNone(departure["time"])
            store.save(SavedFacts(checkin="15:00"))
            arrival=next(item for item in schedule(store)["items"] if item["id"]==arrival["id"])
            self.assertEqual((arrival["time"],arrival["time_basis"]),("15:00","standard_policy"))

    def test_cancelled_orders_excluded_but_recorded_refund_plan_does_not_cancel(self):
        with tempfile.TemporaryDirectory() as folder:
            store=FactStore(Path(folder)/"dates.sqlite3")
            before=schedule(store)
            advice=local_advice(AdviceQuery(id="refund"),store)
            record_decision(SaveDecision(id="refund",decision="refund_proposed",fingerprint=advice["fingerprint"],request_id=uuid4()),store)
            self.assertEqual(schedule(store),before)
            with closing(store.connect()) as db:
                db.execute("UPDATE demo_reservations SET status='cancelled' WHERE id='future-204'")
                db.commit()
            self.assertFalse(any(item["order_id"]=="future-204" for item in schedule(store)["items"]))
            with closing(store.connect()) as db:
                db.execute("DELETE FROM demo_reservations")
                db.commit()
            self.assertEqual(schedule(store)["items"],[])
