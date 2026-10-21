import asyncio
import os
import sqlite3
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from app.main import app
from app.local_facts import FactStore, SavedFacts
from app.contracts import ReplyDecisionRequest
from app.reply_service import decide_reply

class LocalFactTests(unittest.TestCase):
    def test_concurrent_database_initialization_is_atomic(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'concurrent.sqlite3'
            def open_database(_):
                with closing(FactStore(path).connect()) as connection:
                    return connection.execute('SELECT COUNT(*) FROM demo_messages').fetchone()[0]
            with ThreadPoolExecutor(max_workers=8) as pool:
                self.assertEqual(list(pool.map(open_database,range(8))),[2]*8)
            with closing(sqlite3.connect(path)) as connection:
                self.assertEqual(connection.execute('PRAGMA user_version').fetchone()[0],6)

    def test_schema_upgrade_preserves_old_facts_and_history_survives_fact_changes(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'facts.sqlite3'
            with closing(sqlite3.connect(path)) as db:
                db.execute('CREATE TABLE facts (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)')
                db.execute("INSERT INTO facts VALUES ('breakfast','08:00–09:00','2026-10-21T00:00:00+00:00')")
                db.execute('PRAGMA user_version=1')
                db.commit()
            store=FactStore(path)
            facts=store.read()
            self.assertEqual(facts[0].value,'08:00–09:00')
            result=decide_reply(ReplyDecisionRequest(question='When is breakfast?',facts=facts))
            store.record_reply('When is breakfast?','en',result)
            store.save(SavedFacts(breakfast='09:00–10:00'))
            history=FactStore(path).reply_history()
            self.assertEqual(history[0]['result']['citations'][0]['value'],'08:00–09:00')
            self.assertFalse(history[0]['result']['sent'])
            self.assertEqual(len(FactStore(path).reply_history()),1)

    def test_newer_schema_is_not_downgraded(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'facts.sqlite3'
            with closing(sqlite3.connect(path)) as db:
                db.execute('PRAGMA user_version = 7')
            with self.assertRaises(RuntimeError):
                FactStore(path).read()
            with closing(sqlite3.connect(path)) as db:
                self.assertEqual(db.execute('PRAGMA user_version').fetchone()[0], 7)

    def test_persist_update_and_clear(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'facts.sqlite3'
            self.assertEqual(FactStore(path).read(), [])
            FactStore(path).save(SavedFacts(breakfast='08:00-10:30', checkin='15:00'))
            self.assertEqual(FactStore(path).read()[0].value, '08:00–10:30')
            FactStore(path).save(SavedFacts(checkin='16:00'))
            facts = FactStore(path).read()
            self.assertEqual([(f.key, f.value) for f in facts], [('checkin', '16:00')])
            FactStore(path).save(SavedFacts())
            self.assertEqual(FactStore(path).read(), [])

    def test_time_validation(self):
        for value in ['25:00–26:00', '10:00–08:00', 'free breakfast', '08:60–10:00']:
            with self.assertRaises(ValueError):
                SavedFacts(breakfast=value)

    def test_api_flow_and_guards(self):
        async def run(path):
            transport = httpx.ASGITransport(app=app, client=('127.0.0.1', 123))
            async with httpx.AsyncClient(transport=transport, base_url='http://localhost') as client:
                with patch.dict(os.environ, {'HOMESTAY_LOCAL_DATA': '0'}):
                    self.assertEqual((await client.get('/v1/local/facts')).status_code, 404)
                with patch.dict(os.environ, {'HOMESTAY_LOCAL_DATA': '1', 'HOMESTAY_LOCAL_DB': str(path)}):
                    question = {'question': 'When is breakfast?', 'auto_reply_enabled': True}
                    result = (await client.post('/v1/local/reply-decision', json=question)).json()
                    self.assertEqual(result['reason_code'], 'missing_fact')
                    saved = await client.put('/v1/local/facts', json={'breakfast': '08:00–10:30'})
                    self.assertEqual(saved.status_code, 200)
                    result = (await client.post('/v1/local/reply-decision', json=question)).json()
                    self.assertEqual(result['citations'][0]['value'], '08:00–10:30')
                    self.assertFalse(result['sent'])
                    history=(await client.get('/v1/local/reply-history')).json()['items']
                    self.assertEqual(len(history),2)
                    self.assertIn('id',history[0])
                    self.assertEqual(history[0]['result']['reason_code'],'ready')
                    forged = await client.post('/v1/local/reply-decision', json={**question, 'facts': []})
                    self.assertEqual(forged.status_code, 422)
                    invalid = await client.put('/v1/local/facts', json={'breakfast': '26:00–27:00'})
                    self.assertEqual(invalid.status_code, 422)
                    self.assertEqual((await client.get('/v1/local/facts')).json()['facts'][0]['value'], '08:00–10:30')
                    await client.put('/v1/local/facts', json={})
                    self.assertEqual((await client.post('/v1/local/reply-decision', json=question)).json()['reason_code'], 'missing_fact')
            remote = httpx.ASGITransport(app=app, client=('192.168.1.2', 123))
            with patch.dict(os.environ, {'HOMESTAY_LOCAL_DATA': '1'}):
                async with httpx.AsyncClient(transport=remote, base_url='http://localhost') as client:
                    self.assertEqual((await client.get('/v1/local/facts')).status_code, 404)
        with tempfile.TemporaryDirectory() as folder:
            asyncio.run(run(Path(folder) / 'facts.sqlite3'))
