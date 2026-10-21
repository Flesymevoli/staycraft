import asyncio
import json
import os
import unittest
from unittest.mock import patch

import httpx
from app.contracts import PropertyFact, ReplyDecisionRequest
from app.model_service import generate_reply

CONFIG = {'MODEL_ENABLED':'1','MODEL_API_KEY':'test-only','MODEL_BASE_URL':'https://api.deepseek.com','MODEL_NAME':'deepseek-flash'}

class ModelTests(unittest.TestCase):
    def request(self, question='When is breakfast?'):
        return ReplyDecisionRequest(question=question,auto_reply_enabled=True,facts=[PropertyFact(key='breakfast',value='08:00–09:00',status='confirmed')])

    def run_model(self, handler, request=None):
        with patch.dict(os.environ, CONFIG):
            return asyncio.run(generate_reply(request or self.request(),httpx.MockTransport(handler)))

    def test_grounded_model_draft_always_needs_review(self):
        def handler(request):
            data=json.loads(request.content)
            self.assertEqual(data['model'],'deepseek-flash')
            self.assertEqual(data['max_tokens'],256)
            self.assertIn('08:00–09:00',data['messages'][1]['content'])
            return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'draft':'Breakfast is served 08:00–09:00.'})}}]})
        result=self.run_model(handler)
        self.assertEqual(result.engine,'model_v1')
        self.assertEqual(result.disposition,'needs_review')
        self.assertFalse(result.sent)
        self.assertEqual(result.citations[0].key,'breakfast')

    def test_sensitive_and_missing_facts_never_call_provider(self):
        def fail(request):
            self.fail('Unexpected external request')
        for question in ['Can I get a refund?', 'Can I check in early?', 'What time is check-in?']:
            result=self.run_model(fail,self.request(question))
            self.assertEqual(result.engine,'rules_v1')
            self.assertEqual(result.disposition,'needs_review')

    def test_failures_do_not_retry_or_claim_ai_success(self):
        for status in [401,402,429,500]:
            calls=[]
            def handler(request):
                calls.append(1)
                return httpx.Response(status,json={'error':'private provider error'})
            result=self.run_model(handler)
            self.assertEqual(len(calls),1)
            self.assertEqual(result.reason_code,'model_unavailable')
            self.assertEqual(result.engine,'rules_v1')
            self.assertNotIn('private',result.model_dump_json())

    def test_invalid_output_or_altered_fact_is_not_displayed(self):
        for content in ['not json',json.dumps({'draft':'Breakfast at 10:00.'}),json.dumps({'draft':'Breakfast 08:00–09:00, costs 20.'}), '[]']:
            result=self.run_model(lambda request:httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':content}}]}))
            self.assertEqual(result.reason_code,'model_unavailable')
            self.assertEqual(result.draft,'Breakfast hours: 08:00–09:00.')

    def test_timeout_and_truncation(self):
        def timeout(request):
            raise httpx.ReadTimeout('secret',request=request)
        self.assertEqual(self.run_model(timeout).reason_code,'model_unavailable')
        result=self.run_model(lambda request:httpx.Response(200,json={'choices':[{'finish_reason':'length','message':{'content':'{}'}}]}))
        self.assertEqual(result.reason_code,'model_unavailable')

    def test_disabled_mode_never_calls_provider(self):
        with patch.dict(os.environ,{'MODEL_ENABLED':'0'}):
            result=asyncio.run(generate_reply(self.request(),httpx.MockTransport(lambda request:self.fail('External call'))))
            self.assertEqual(result.reason_code,'ready')

    def test_school_compatible_endpoint_without_deepseek_extension(self):
        def handler(request):
            self.assertEqual(str(request.url),'https://school.example/v1/chat/completions')
            self.assertNotIn('thinking',json.loads(request.content))
            return httpx.Response(429,json={})
        with patch.dict(os.environ,{**CONFIG,'MODEL_BASE_URL':'https://school.example/v1'}):
            result=asyncio.run(generate_reply(self.request(),httpx.MockTransport(handler)))
            self.assertEqual(result.reason_code,'model_unavailable')
