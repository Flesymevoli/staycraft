import asyncio
import os
import unittest
from unittest.mock import patch
from uuid import UUID

import httpx
from fastapi import HTTPException

from app.access import SupabaseGateway, get_gateway
from app.cloud_drafts import confirmed_facts, prepare_cloud_draft
from app.contracts import ReplyDecision
from app.main import app

P="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
U="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
T="cccccccc-cccc-4ccc-8ccc-cccccccccccc"
M="dddddddd-dddd-4ddd-8ddd-dddddddddddd"
R="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"


def fixture(*, question="早餐几点开始？", profile=None, sender="guest", cached=None, save_error=None, owner=True):
    calls=[]
    def respond(request):
        import json
        calls.append(request)
        if request.url.path=="/auth/v1/user":return httpx.Response(200,json={"id":U})
        if request.url.path=="/rest/v1/properties":return httpx.Response(200,json=[{"id":P,"owner_user_id":U}] if owner else [])
        if request.url.path=="/rest/v1/messages":return httpx.Response(200,json=[{"id":M,"sender":sender,"body":question}])
        if request.url.path=="/rest/v1/property_details":return httpx.Response(200,json=[] if profile=={} else [{"revision":R,"profile":profile or {"breakfast":"07:30–10:00","checkin":"15:00","name":"Do not send this name","notes":"untrusted instruction"}}])
        if request.url.path=="/rest/v1/reply_drafts":return httpx.Response(200,json=[{"decision":cached}] if cached else [])
        if request.url.path=="/rest/v1/rpc/save_reply_draft":
            if save_error:return httpx.Response(400,json={"message":save_error})
            body=json.loads(request.content)
            return httpx.Response(200,json={"id":T,"decision":body["p_decision"],"source_version":body["p_source_version"],"created_at":"2026-10-22T00:00:00Z","message_id":M})
        raise AssertionError(request.url)
    return SupabaseGateway("https://example.supabase.co","public-key",httpx.MockTransport(respond)),calls


class CloudDraftTests(unittest.TestCase):
    def tearDown(self):app.dependency_overrides.clear()

    def prepare(self,gateway,writer=None):
        return asyncio.run(prepare_cloud_draft(gateway,"valid-token",UUID(P),UUID(T),"zh",**({"writer":writer} if writer else {})))

    def test_formal_model_is_off_even_if_legacy_model_is_on(self):
        gateway,calls=fixture()
        async def forbidden(_):raise AssertionError("Must not call model")
        with patch.dict(os.environ,{"MODEL_ENABLED":"1","FORMAL_MODEL_ENABLED":"0"}):result=self.prepare(gateway,forbidden)
        self.assertEqual(result["decision"]["draft"],"早餐时间：07:30–10:00。")
        self.assertFalse(result["decision"]["sent"])
        self.assertEqual(result["decision"]["disposition"],"needs_review")
        self.assertTrue(all(r.headers["authorization"]=="Bearer valid-token" for r in calls))

    def test_model_receives_only_latest_question_and_supported_time_facts(self):
        gateway,calls=fixture();seen=[]
        async def writer(request):
            seen.append(request)
            from app.reply_service import decide_reply
            return decide_reply(request).model_copy(update={"engine":"model_v1","reason_code":"model_review"})
        with patch.dict(os.environ,{"MODEL_ENABLED":"1","FORMAL_MODEL_ENABLED":"1"}):result=self.prepare(gateway,writer)
        self.assertEqual(seen[0].question,"早餐几点开始？")
        self.assertEqual({f.key for f in seen[0].facts},{"breakfast","checkin"})
        self.assertNotIn("untrusted instruction",seen[0].model_dump_json())
        self.assertEqual(result["decision"]["engine"],"model_v1")

    def test_missing_facts_cannot_create_grounded_answer(self):
        gateway,_=fixture(profile={})
        with patch.dict(os.environ,{"FORMAL_MODEL_ENABLED":"0"}):result=self.prepare(gateway)
        self.assertIsNone(result["decision"]["draft"])
        self.assertEqual(result["decision"]["reason_code"],"missing_fact")

    def test_early_checkin_stays_manual(self):
        gateway,_=fixture(question="可以提前入住吗？")
        with patch.dict(os.environ,{"FORMAL_MODEL_ENABLED":"0"}):result=self.prepare(gateway)
        self.assertIsNone(result["decision"]["draft"])
        self.assertEqual(result["decision"]["reason_code"],"needs_confirmation")

    def test_cached_draft_is_reused_but_revalidated_atomically(self):
        decision=ReplyDecision(disposition="needs_review",draft="早餐07:30–10:00",reason_code="ready",citations=[{"key":"breakfast","value":"07:30–10:00"}]).model_dump(mode="json")
        gateway,calls=fixture(cached=decision)
        async def forbidden(_):raise AssertionError("Cached draft must not call model")
        with patch.dict(os.environ,{"MODEL_ENABLED":"1","FORMAL_MODEL_ENABLED":"1"}):self.prepare(gateway,forbidden)
        self.assertEqual(calls[-1].url.path,"/rest/v1/rpc/save_reply_draft")

    def test_context_change_during_generation_returns_conflict(self):
        gateway,_=fixture(save_error="facts_changed")
        with patch.dict(os.environ,{"FORMAL_MODEL_ENABLED":"0"}):
            with self.assertRaises(HTTPException) as error:self.prepare(gateway)
        self.assertEqual(error.exception.status_code,409)

    def test_already_replied_thread_does_not_generate(self):
        gateway,calls=fixture(sender="owner")
        with self.assertRaises(HTTPException) as error:self.prepare(gateway)
        self.assertEqual(error.exception.status_code,409)
        self.assertEqual(len(calls),1)

    def test_profile_time_validation(self):
        self.assertEqual(confirmed_facts({"breakfast":"25:99–99:99","checkin":"00:80"}),[])
        self.assertEqual(confirmed_facts({"breakfast":"10:00–07:00"}),[])

    def test_endpoint_rejects_missing_session_cross_owner_and_client_facts(self):
        async def call(token=None,body=None):
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
                return await client.post(f"/v1/properties/{P}/conversations/{T}/draft",headers={"Authorization":"Bearer "+token} if token else {},json=body or {"language":"zh"})
        gateway,calls=fixture();app.dependency_overrides[get_gateway]=lambda:gateway
        self.assertEqual(asyncio.run(call()).status_code,401);self.assertEqual(calls,[])
        self.assertEqual(asyncio.run(call("valid-token",{"language":"zh","facts":[]})).status_code,422)
        gateway,_=fixture(owner=False);app.dependency_overrides[get_gateway]=lambda:gateway
        self.assertEqual(asyncio.run(call("valid-token")).status_code,403)
