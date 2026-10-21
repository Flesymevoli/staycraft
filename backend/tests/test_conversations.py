import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

import httpx
from app.main import app
from app.reply_service import decide_reply
from app.local_facts import FactStore, SavedFacts

class ConversationTests(unittest.TestCase):
    def run_case(self, case):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'demo.sqlite3'
            with patch.dict(os.environ,{'HOMESTAY_LOCAL_DATA':'1','HOMESTAY_LOCAL_DB':str(path),'MODEL_ENABLED':'0'}):
                async def run():
                    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=('127.0.0.1',80)),base_url='http://localhost') as client:
                        await case(client,FactStore(path))
                asyncio.run(run())

    def test_seeds_messages_once_and_keeps_owner_replies(self):
        async def case(client,store):
            items=(await client.get('/v1/local/conversations')).json()['items']
            self.assertEqual(len(items),2)
            self.assertEqual(items[0]['messages'][0]['sender'],'guest')
            payload={'thread_id':'breakfast','request_id':str(uuid4()),'body':'A manually reviewed demo reply'}
            self.assertEqual((await client.post('/v1/local/conversation-reply',json=payload)).status_code,200)
            # Reopening all tables must not reseed or overwrite saved messages.
            store.read()
            thread=(await client.get('/v1/local/conversation?thread_id=breakfast')).json()
            self.assertEqual(len(thread['messages']),2)
            self.assertEqual(thread['messages'][-1]['body_en'],payload['body'])
            self.assertEqual((await client.get('/v1/local/conversation?thread_id=other')).status_code,422)
        self.run_case(case)

    def test_owner_save_retry_is_idempotent_and_rejects_changed_body(self):
        async def case(client,store):
            await client.get('/v1/local/conversations')
            payload={'thread_id':'transfer','request_id':str(uuid4()),'body':'I will check the driver availability.'}
            for _ in range(2):
                self.assertEqual((await client.post('/v1/local/conversation-reply',json=payload)).status_code,200)
            self.assertEqual(len((await client.get('/v1/local/conversation?thread_id=transfer')).json()['messages']),2)
            self.assertEqual((await client.post('/v1/local/conversation-reply',json={**payload,'body':'Changed'})).status_code,409)
            self.assertEqual((await client.post('/v1/local/conversation-reply',json={**payload,'body':'  '})).status_code,422)
        self.run_case(case)

    def test_draft_is_cached_and_updated_facts_regenerate(self):
        async def case(client,store):
            store.save(SavedFacts(breakfast='08:00–09:00'))
            calls=[]
            async def fake(request):
                calls.append(request)
                return decide_reply(request)
            payload={'thread_id':'breakfast','language':'en','auto_reply_enabled':True}
            with patch('app.conversations.generate_reply',fake):
                first=(await client.post('/v1/local/conversation-draft',json=payload)).json()
                second=(await client.post('/v1/local/conversation-draft',json=payload)).json()
                self.assertEqual(first['decision'],second['decision'])
                self.assertEqual(len(calls),1)
                store.save(SavedFacts(breakfast='09:00–10:00'))
                third=(await client.post('/v1/local/conversation-draft',json=payload)).json()
                self.assertIn('09:00–10:00',third['decision']['draft'])
                self.assertEqual(len(calls),2)
                await client.post('/v1/local/conversation-reply',json={'thread_id':'breakfast','request_id':str(uuid4()),'body':'Reviewed.'})
                await client.post('/v1/local/conversation-draft',json=payload)
                self.assertEqual(len(calls),2)
        self.run_case(case)

    def test_concurrent_open_does_not_double_call_and_cannot_save_mid_generation(self):
        async def case(client,store):
            store.save(SavedFacts(breakfast='08:00–09:00'))
            entered=asyncio.Event();release=asyncio.Event();calls=[]
            async def fake(request):
                calls.append(request);entered.set();await release.wait();return decide_reply(request)
            payload={'thread_id':'breakfast','auto_reply_enabled':True}
            with patch('app.conversations.generate_reply',fake):
                task=asyncio.create_task(client.post('/v1/local/conversation-draft',json=payload))
                await asyncio.wait_for(entered.wait(),2)
                second=await client.post('/v1/local/conversation-draft',json=payload)
                self.assertEqual(second.json()['draft_state'],'processing')
                reply=await client.post('/v1/local/conversation-reply',json={'thread_id':'breakfast','request_id':str(uuid4()),'body':'Unsafe overlap'})
                self.assertEqual(reply.status_code,409)
                release.set();self.assertEqual((await task).status_code,200)
                self.assertEqual(len(calls),1)
        self.run_case(case)

    def test_processing_failure_allows_manual_reply_without_automatic_paid_retry(self):
        async def case(client,store):
            calls=[]
            async def fail(request):
                calls.append(1);raise RuntimeError('Private service failure')
            payload={'thread_id':'breakfast','auto_reply_enabled':True}
            with patch('app.conversations.generate_reply',fail):
                response=await client.post('/v1/local/conversation-draft',json=payload)
                self.assertEqual(response.status_code,503)
                self.assertNotIn('Private',response.text)
                response=await client.post('/v1/local/conversation-draft',json=payload)
                self.assertEqual(response.json()['draft_state'],'failed')
                self.assertEqual(len(calls),1)
                reply=await client.post('/v1/local/conversation-reply',json={'thread_id':'breakfast','request_id':str(uuid4()),'body':'Manual response'})
                self.assertEqual(reply.status_code,200)
        self.run_case(case)
