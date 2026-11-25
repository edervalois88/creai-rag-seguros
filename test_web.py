import unittest

from api.chat import chat, parse_request


class WebTests(unittest.TestCase):
    def test_endorsement_has_real_spans(self):
        outcome = chat({
            "question": "Límite de grúa", "profile": "customer", "incidentDate": "2026-01-01"
        })["replies"][0]
        self.assertEqual(outcome["rule"]["title"], "Precedencia del endoso")
        self.assertEqual(outcome["rule"]["superseded"], ["AUTO-v2-8"])
        self.assertIn("100 km", outcome["citations"][0]["text"])
        self.assertEqual([step["name"] for step in outcome["trace"]["steps"]],
                         ["dispatch", "retrieve", "compose"])

    def test_auth_boundary_omits_private_citations(self):
        outcome = chat({"question": "Deducible", "profile": "public", "incidentDate": "2026-01-01"})
        self.assertEqual(outcome["replies"][0]["status"], "auth_required")
        self.assertEqual(outcome["replies"][0]["citations"], [])

    def test_ack_is_linked_to_interrupt(self):
        replies = chat({
            "question": "¿Me van a pagar?", "profile": "customer", "simulateAck": True
        })["replies"]
        self.assertEqual([r["status"] for r in replies], ["pending_review", "received"])
        self.assertEqual(replies[0]["trace"]["id"], replies[1]["trace"]["previousId"])
        self.assertEqual(replies[0]["trace"]["requestId"], replies[1]["trace"]["requestId"])

    def test_unexpected_fields_rejected(self):
        with self.assertRaises(ValueError):
            parse_request({"question": "Deducible", "profile": "public", "tenant": "another"})

    def test_empty_question_rejected(self):
        with self.assertRaises(ValueError):
            parse_request({"question": "   ", "profile": "public"})
