import unittest

from app.contracts import EarlyCheckinAdviceRequest, RefundAdviceRequest
from app.operation_service import advise_operation


class OperationAdviceTests(unittest.TestCase):
    def test_early_checkin_waits_for_cleaning_and_room_confirmation(self):
        advice = advise_operation(EarlyCheckinAdviceRequest(
            kind="early_checkin", standard_time="14:00", requested_time="12:00",
        ))
        self.assertEqual(advice.recommended_action, "verify_readiness")
        self.assertEqual(advice.missing_checks, ["cleaning_ready", "room_available"])
        self.assertEqual(advice.external_status, "not_started")

    def test_confirmed_room_can_be_considered_but_not_executed(self):
        advice = advise_operation(EarlyCheckinAdviceRequest(
            kind="early_checkin", standard_time="14:00", requested_time="12:00",
            cleaning_ready=True, room_available=True,
        ))
        self.assertEqual(advice.recommended_action, "consider_early_checkin")
        self.assertTrue(advice.requires_owner_decision)
        self.assertEqual(advice.external_status, "not_started")

    def test_unavailable_room_keeps_standard_time(self):
        advice = advise_operation(EarlyCheckinAdviceRequest(
            kind="early_checkin", standard_time="14:00", requested_time="12:00",
            cleaning_ready=False, room_available=True,
        ))
        self.assertEqual(advice.reason_code, "room_not_ready")

    def test_refund_policy_boundary_and_outside_case(self):
        for arrival, expected in (("2026-09-21", "propose_full_refund"), ("2026-09-20", "review_refund")):
            with self.subTest(arrival=arrival):
                advice = advise_operation(RefundAdviceRequest(
                    kind="refund", requested_on="2026-09-18", arrival_on=arrival,
                    paid_amount_yuan=1040, payment_confirmed=True, full_refund_min_days=3,
                ))
                self.assertEqual(advice.recommended_action, expected)
                self.assertEqual(advice.suggested_refund_yuan, 1040 if expected == "propose_full_refund" else None)
                self.assertEqual(advice.external_status, "not_started")

    def test_unconfirmed_payment_never_proposes_refund(self):
        advice = advise_operation(RefundAdviceRequest(
            kind="refund", requested_on="2026-09-18", arrival_on="2026-09-22",
            paid_amount_yuan=1040, payment_confirmed=False, full_refund_min_days=3,
        ))
        self.assertEqual(advice.reason_code, "payment_unconfirmed")
        self.assertIn("payment_confirmation", advice.missing_checks)
        self.assertIsNone(advice.suggested_refund_yuan)


if __name__ == "__main__":
    unittest.main()
