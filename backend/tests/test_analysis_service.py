import asyncio,json,os,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import httpx
from app.analysis_service import sample_metrics,build_summary
from app.local_facts import FactStore
from app.main import app

CONFIG={'MODEL_ENABLED':'1','MODEL_API_KEY':'test-key','MODEL_BASE_URL':'https://api.deepseek.com','MODEL_NAME':'deepseek-flash'}
class AnalysisTests(unittest.TestCase):
    def test_metrics_are_computed_and_keep_external_signals_separate(self):
        metrics=sample_metrics(7)
        self.assertEqual(metrics['occupancy_pct'],70)
        self.assertEqual(metrics['weekday_pct'],64)
        self.assertEqual(metrics['weekend_pct'],85)
        self.assertEqual(metrics['satisfaction'],4.8)
        self.assertEqual(sample_metrics(28)['occupancy_pct'],64)
        self.assertNotIn('occupied_room_nights',metrics)
        self.assertTrue(metrics['sample'])

    def test_success_cached_and_language_range_are_distinct(self):
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,CONFIG):
            store=FactStore(Path(folder)/'a.sqlite3');calls=[]
            def handler(request):
                calls.append(json.loads(request.content))
                return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':json.dumps({'paragraphs':['Weekdays have more availability.','Review a focused promotion before changing rates.']})}}]})
            async def run():
                first=await build_summary(store,7,'en',httpx.MockTransport(handler))
                second=await build_summary(store,7,'en',httpx.MockTransport(handler))
                self.assertEqual(first,second);self.assertEqual(first['engine'],'model_v1');self.assertEqual(len(calls),1)
                await build_summary(store,28,'en',httpx.MockTransport(handler));self.assertEqual(len(calls),2)
                await build_summary(store,7,'zh',httpx.MockTransport(handler));self.assertEqual(len(calls),3)
            asyncio.run(run())

    def test_provider_failure_and_numeric_output_use_labelled_fallback(self):
        for content in ['not json',json.dumps({'paragraphs':['Occupancy is 70%.','Other.']})]:
            with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,CONFIG):
                store=FactStore(Path(folder)/'a.sqlite3')
                def handler(request):
                    return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'content':content}}]})
                result=asyncio.run(build_summary(store,7,'zh',httpx.MockTransport(handler)))
                self.assertEqual(result['engine'],'rules_v1');self.assertEqual(result['reason'],'model_unavailable')
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,CONFIG):
            calls=[]
            def fail(request):
                calls.append(1);return httpx.Response(429,json={'error':'private'})
            store=FactStore(Path(folder)/'a.sqlite3')
            for _ in range(2):
                result=asyncio.run(build_summary(store,7,'en',httpx.MockTransport(fail)))
                self.assertEqual(result['reason'],'model_unavailable')
            self.assertEqual(len(calls),1)

    def test_summary_endpoint_modes_and_query_validation(self):
        with tempfile.TemporaryDirectory() as folder,patch.dict(os.environ,{'MODEL_ENABLED':'0','HOMESTAY_LOCAL_DATA':'1','HOMESTAY_LOCAL_DB':str(Path(folder)/'a.sqlite3')}):
            async def run():
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app,client=('127.0.0.1',80)),base_url='http://localhost') as client:
                    response=await client.get('/v1/local/analysis-summary?days=7&language=zh')
                    self.assertEqual(response.status_code,200)
                    self.assertEqual(response.json()['engine'],'rules_v1')
                    self.assertEqual(response.json()['metrics']['occupancy_pct'],70)
                    self.assertEqual((await client.get('/v1/local/analysis-summary?days=10')).status_code,422)
                    self.assertEqual((await client.get('/v1/local/analysis-summary?language=xx')).status_code,422)
            asyncio.run(run())
