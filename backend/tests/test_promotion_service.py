import asyncio,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import httpx
from app.main import app
from app.local_facts import FactStore
from app.promotion_service import PromotionRequest,generate_promotion,rule_content

class PromotionTests(unittest.TestCase):
    def test_context_and_channel_are_used_by_rule_fallback(self):
        market=rule_content(PromotionRequest(context='market',language='zh'))['content']
        walk=rule_content(PromotionRequest(context='walk',language='zh'))['content']
        self.assertIn('湖畔周末市集',market);self.assertIn('村落晨间漫步',walk)
        self.assertIn('#',market)
        self.assertNotIn('#',rule_content(PromotionRequest(channel='wechat'))['content'])

    def test_generated_output_is_cached_and_invalid_numbers_fall_back(self):
        config={'MODEL_ENABLED':'1','MODEL_API_KEY':'test','MODEL_BASE_URL':'https://api.deepseek.com','MODEL_NAME':'deepseek-flash'}
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,config):
            store=FactStore(Path(folder)/'p.sqlite3');calls=[]
            def handler(request):
                calls.append(json.loads(request.content));return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'content':'A slower weekday escape. Local market is a sample idea to verify.'})}}]})
            async def run():
                request=PromotionRequest()
                first=await generate_promotion(store,request,httpx.MockTransport(handler))
                second=await generate_promotion(store,request,httpx.MockTransport(handler))
                self.assertEqual(first,second);self.assertEqual(first['engine'],'model_v1');self.assertEqual(len(calls),1)
                self.assertIn('fictional lakeside weekend market',calls[0]['messages'][1]['content'])
            asyncio.run(run())
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,config):
            def invalid(request):
                return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'content':'Book now for 50% off.'})}}]})
            result=asyncio.run(generate_promotion(FactStore(Path(folder)/'p.sqlite3'),PromotionRequest(),httpx.MockTransport(invalid)))
            self.assertEqual(result['engine'],'rules_v1');self.assertEqual(result['reason'],'model_unavailable')

    def test_save_persists_without_publishing_and_separates_channels(self):
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'HOMESTAY_LOCAL_DATA':'1','MODEL_ENABLED':'0','HOMESTAY_LOCAL_DB':str(Path(folder)/'p.sqlite3')}):
            async def run():
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=('127.0.0.1',80)),base_url='http://localhost') as client:
                    request={'context':'market','channel':'xiaohongshu','language':'zh'}
                    initial=await client.get('/v1/local/promotion-draft?context=market&channel=xiaohongshu&language=zh')
                    self.assertEqual(initial.json()['content'],'')
                    generated=await client.post('/v1/local/promotion-generate',json=request)
                    self.assertEqual(generated.json()['engine'],'rules_v1')
                    saved=await client.put('/v1/local/promotion-draft',json={**request,'content':'My edited demo copy'})
                    self.assertFalse(saved.json()['published'])
                    again=await client.get('/v1/local/promotion-draft?context=market&channel=xiaohongshu&language=zh')
                    self.assertEqual(again.json()['content'],'My edited demo copy')
                    other=await client.get('/v1/local/promotion-draft?context=market&channel=wechat&language=zh')
                    self.assertEqual(other.json()['content'],'')
                    self.assertEqual((await client.put('/v1/local/promotion-draft',json={**request,'content':'  '})).status_code,422)
                    self.assertEqual((await client.post('/v1/local/promotion-generate',json={**request,'context':'untrusted'})).status_code,422)
            asyncio.run(run())
