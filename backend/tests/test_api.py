import asyncio
import json
import unittest

from app.main import app


async def call_api(path: str, body: dict) -> tuple[int, dict]:
    data = json.dumps(body).encode("utf-8")
    messages = []
    received = False

    async def receive():
        nonlocal received
        if not received:
            received = True
            return {"type": "http.request", "body": data, "more_body": False}
        # Keep the connection open until the response has been sent.
        await asyncio.Event().wait()

    async def send(message):
        messages.append(message)

    await asyncio.wait_for(app(
        {
            "type": "http", "http_version": "1.1", "method": "POST",
            "scheme": "http", "path": path, "raw_path": path.encode(),
            "query_string": b"", "root_path": "", "headers": [(b"content-type", b"application/json")],
            "client": ("test", 1234), "server": ("test", 80),
        },
        receive,
        send,
    ), timeout=3)
    status = next(message["status"] for message in messages if message["type"] == "http.response.start")
    response = b"".join(message.get("body", b"") for message in messages if message["type"] == "http.response.body")
    return status, json.loads(response)


class ApiTests(unittest.TestCase):
    def test_decision_endpoint_returns_unsent_grounded_draft(self):
        status, response = asyncio.run(call_api("/v1/reply-decisions", {
            "question": "When is breakfast?", "auto_reply_enabled": True,
            "facts": [{"key": "breakfast", "value": "07:30–10:00", "status": "confirmed"}],
        }))
        self.assertEqual(status, 200)
        self.assertEqual(response["disposition"], "auto_reply_ready")
        self.assertEqual(response["citations"][0]["value"], "07:30–10:00")
        self.assertFalse(response["sent"])

    def test_blank_question_is_rejected(self):
        status, _ = asyncio.run(call_api("/v1/reply-decisions", {"question": "   "}))
        self.assertEqual(status, 422)


if __name__ == "__main__":
    unittest.main()
