import unittest

from app.contracts import PropertyFact, ReplyDecisionRequest
from app.reply_service import decide_reply


class ReplyServiceTests(unittest.TestCase):
    def request(self, question, facts=(), enabled=True, language="en"):
        return ReplyDecisionRequest(
            question=question, facts=list(facts),
            auto_reply_enabled=enabled, language=language
        )

    def test_confirmed_breakfast_fact_is_cited_and_eligible(self):
        result = decide_reply(self.request(
            "When is breakfast?",
            [PropertyFact(key="breakfast", value="07:30–10:00", status="confirmed")]
        ))
        self.assertEqual(result.disposition, "auto_reply_ready")
        self.assertEqual(result.draft, "Breakfast hours: 07:30–10:00.")
        self.assertEqual(result.citations[0].key, "breakfast")
        self.assertFalse(result.sent)

    def test_changed_fact_changes_next_draft(self):
        original = decide_reply(self.request("早餐几点?", [
            PropertyFact(key="breakfast", value="07:30–10:00", status="confirmed")
        ], language="zh"))
        changed = decide_reply(self.request("早餐几点?", [
            PropertyFact(key="breakfast", value="08:00–10:00", status="confirmed")
        ], language="zh"))
        self.assertIn("07:30", original.draft)
        self.assertIn("08:00", changed.draft)

    def test_missing_or_unconfirmed_fact_needs_review(self):
        for facts in ([], [PropertyFact(key="breakfast", value="07:30–10:00", status="draft")]):
            with self.subTest(facts=facts):
                result = decide_reply(self.request("Breakfast time?", facts))
                self.assertEqual(result.reason_code, "missing_fact")
                self.assertIsNone(result.draft)

    def test_conflicting_confirmed_facts_need_review(self):
        result = decide_reply(self.request("Breakfast time?", [
            PropertyFact(key="breakfast", value="07:30–10:00", status="confirmed"),
            PropertyFact(key="breakfast", value="08:00–10:00", status="confirmed"),
        ]))
        self.assertEqual(result.disposition, "needs_review")

    def test_disabled_auto_reply_keeps_draft_for_owner(self):
        result = decide_reply(self.request("Breakfast time?", [
            PropertyFact(key="breakfast", value="07:30–10:00", status="confirmed")
        ], enabled=False))
        self.assertEqual(result.reason_code, "auto_reply_off")
        self.assertIsNotNone(result.draft)
        self.assertFalse(result.sent)

    def test_transfer_and_refund_are_never_auto_eligible(self):
        for question in ("Can you recommend a driver?", "I want a refund"):
            with self.subTest(question=question):
                result = decide_reply(self.request(question))
                self.assertEqual(result.disposition, "needs_review")
                self.assertFalse(result.sent)

    def test_early_checkin_takes_precedence_over_normal_checkin(self):
        result = decide_reply(self.request("Can I check in early?", [
            PropertyFact(key="checkin", value="14:00", status="confirmed")
        ]))
        self.assertEqual(result.reason_code, "needs_confirmation")

    def test_other_breakfast_questions_are_not_answered_with_hours(self):
        result = decide_reply(self.request("Is breakfast included?", [
            PropertyFact(key="breakfast", value="07:30–10:00", status="confirmed")
        ]))
        self.assertEqual(result.reason_code, "unsupported_question")

    def test_non_time_value_cannot_be_used_as_time(self):
        result = decide_reply(self.request("When is breakfast?", [
            PropertyFact(key="breakfast", value="Included", status="confirmed")
        ]))
        self.assertEqual(result.reason_code, "missing_fact")


if __name__ == "__main__":
    unittest.main()
