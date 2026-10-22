import asyncio
import unittest
from uuid import UUID

import httpx

from app.access import SupabaseGateway, get_gateway
from app.main import app


USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
PROPERTY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"


def gateway_for(*, identity_status=200, membership_status=200, rows=None, unreachable=False):
    calls = []

    def respond(request):
        calls.append(request)
        if unreachable:
            raise httpx.ConnectError("offline")
        if request.url.path == "/auth/v1/user":
            return httpx.Response(identity_status, json={"id": USER_ID})
        if request.url.path == "/rest/v1/properties":
            return httpx.Response(membership_status, json=rows if rows is not None else [
                {"id": PROPERTY_ID, "owner_user_id": USER_ID}
            ])
        raise AssertionError(f"Unexpected URL: {request.url}")

    return SupabaseGateway("https://example.supabase.co", "public-key", httpx.MockTransport(respond)), calls


async def request_access(token="valid-token"):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        return await client.get(f"/v1/properties/{PROPERTY_ID}/access", headers=headers)


class AccessTests(unittest.TestCase):
    def tearDown(self):
        app.dependency_overrides.clear()

    def test_owner_gets_access_after_identity_and_ownership_are_checked(self):
        gateway, calls = gateway_for()
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"property_id": PROPERTY_ID, "role": "owner"})
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[0].headers["authorization"], "Bearer valid-token")
        self.assertEqual(calls[1].url.params["owner_user_id"], f"eq.{USER_ID}")
        self.assertEqual(calls[1].url.params["id"], f"eq.{PROPERTY_ID}")

    def test_missing_token_is_rejected_without_calling_supabase(self):
        gateway, calls = gateway_for()
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access(token=""))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(calls, [])

    def test_invalid_token_is_rejected(self):
        gateway, calls = gateway_for(identity_status=401)
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 401)
        self.assertEqual(len(calls), 1)

    def test_other_property_is_denied(self):
        gateway, _ = gateway_for(rows=[])
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 403)

    def test_supabase_failure_is_recoverable(self):
        gateway, _ = gateway_for(unreachable=True)
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 503)

    def test_missing_cloud_schema_is_unavailable_not_authorized(self):
        gateway, calls = gateway_for(membership_status=404)
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(len(calls), 2)

    def test_wrong_owner_cannot_gain_property_access(self):
        gateway, _ = gateway_for(rows=[{"id": PROPERTY_ID, "owner_user_id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc"}])
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 503)

    def test_expired_session_is_rejected_before_property_lookup(self):
        gateway, calls = gateway_for(identity_status=403)
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access(token="expired-token"))
        self.assertEqual(response.status_code, 401)
        self.assertEqual(len(calls), 1)

    def test_access_never_trusts_a_mismatched_record(self):
        gateway, _ = gateway_for(rows=[{"id": str(UUID(USER_ID)), "owner_user_id": USER_ID}])
        app.dependency_overrides[get_gateway] = lambda: gateway
        response = asyncio.run(request_access())
        self.assertEqual(response.status_code, 503)
