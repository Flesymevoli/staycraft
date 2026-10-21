"""Opt-in, single-property local development storage. Never a hosted auth fallback."""
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, field_validator

from .contracts import PropertyFact, ReplyDecisionRequest
from .model_service import generate_reply


class SavedFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    breakfast: str = ""
    checkin: str = ""

    @field_validator("breakfast", "checkin")
    @classmethod
    def validate_time(cls, value, info):
        value = value.strip().replace("-", "–").replace("—", "–")
        clock = r"(?:[01]\d|2[0-3]):[0-5]\d"
        pattern = f"{clock}–{clock}" if info.field_name == "breakfast" else clock
        if value and not re.fullmatch(pattern, value):
            raise ValueError("Use HH:MM–HH:MM for breakfast and HH:MM for check-in")
        if info.field_name == "breakfast" and value and value[:5] >= value[6:]:
            raise ValueError("Breakfast end must be after start")
        return value


class LocalQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str
    language: Literal["en", "zh"] = "en"
    auto_reply_enabled: bool = False

    @field_validator("question")
    @classmethod
    def validate_question(cls, value):
        if not 1 <= len(value.strip()) <= 2000:
            raise ValueError("Question must contain 1–2000 characters")
        return value.strip()


class FactStore:
    def __init__(self, path: Path):
        self.path = path

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        try:
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            if version == 5:
                return connection
            # Lock and re-read: several page requests may open a new database
            # together. DDL, seeds and schema version must commit atomically.
            connection.execute("BEGIN IMMEDIATE")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            if version not in range(6):
                raise RuntimeError("Unsupported local database version; restore matching code or migrate explicitly")
            if version < 1:
                connection.execute("CREATE TABLE IF NOT EXISTS facts (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
            if version < 2:
                connection.execute("""CREATE TABLE IF NOT EXISTS reply_runs (
                    id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
                    question TEXT NOT NULL, language TEXT NOT NULL,
                    result_json TEXT NOT NULL
                )""")
            if version < 3:
                connection.execute("CREATE TABLE IF NOT EXISTS demo_threads (id TEXT PRIMARY KEY, guest TEXT NOT NULL, room TEXT NOT NULL)")
                connection.execute("""CREATE TABLE IF NOT EXISTS demo_messages (
                    id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, sender TEXT NOT NULL,
                    body_en TEXT NOT NULL, body_zh TEXT NOT NULL, created_at TEXT NOT NULL,
                    request_id TEXT UNIQUE
                )""")
                connection.execute("""CREATE TABLE IF NOT EXISTS demo_drafts (
                    thread_id TEXT PRIMARY KEY, state TEXT NOT NULL, result_json TEXT,
                    fingerprint TEXT NOT NULL, updated_at TEXT NOT NULL
                )""")
                connection.executemany("INSERT OR IGNORE INTO demo_threads VALUES (?,?,?)", [
                    ("breakfast", "Jamie", "201"), ("transfer", "Morgan", "103")])
                connection.executemany("INSERT OR IGNORE INTO demo_messages VALUES (?,?,?,?,?,?,?)", [
                    ("guest-breakfast", "breakfast", "guest", "What time is breakfast tomorrow?", "明天早餐几点开始？", "2026-09-17T14:32:00+08:00", None),
                    ("guest-transfer", "transfer", "guest", "Can you recommend a driver from the airport? There are two of us.", "可以推荐机场接送司机吗？我们有两个人。", "2026-09-17T14:18:00+08:00", None)])
            if version < 4:
                connection.execute("CREATE TABLE IF NOT EXISTS summary_cache (fingerprint TEXT PRIMARY KEY, result_json TEXT, created_at TEXT NOT NULL)")
            if version < 5:
                connection.execute("CREATE TABLE IF NOT EXISTS promotion_drafts (id TEXT PRIMARY KEY, content TEXT NOT NULL, updated_at TEXT NOT NULL)")
            connection.execute("PRAGMA user_version = 5")
            connection.commit()
            return connection
        except Exception:
            connection.rollback()
            connection.close()
            raise

    def read(self) -> list[PropertyFact]:
        connection = self.connect()
        try:
            return [PropertyFact(key=k, value=v, status="confirmed", updated_at=t)
                    for k, v, t in connection.execute("SELECT key,value,updated_at FROM facts ORDER BY key")]
        finally:
            connection.close()

    def save(self, values: SavedFacts):
        connection = self.connect()
        try:
            with connection:
                connection.execute("DELETE FROM facts")
                connection.executemany("INSERT INTO facts VALUES (?,?,?)", [
                    (k, v, datetime.now(timezone.utc).isoformat())
                    for k, v in values.model_dump().items() if v
                ])
        finally:
            connection.close()

    def record_reply(self, question: str, language: str, result):
        from uuid import uuid4
        connection = self.connect()
        try:
            with connection:
                connection.execute("INSERT INTO reply_runs VALUES (?,?,?,?,?)", (
                    str(uuid4()), datetime.now(timezone.utc).isoformat(), question,
                    language, result.model_dump_json(),
                ))
        finally:
            connection.close()

    def reply_history(self, limit: int = 50):
        import json
        connection = self.connect()
        try:
            return [{"id": row[0], "created_at": row[1], "question": row[2],
                     "language": row[3], "result": json.loads(row[4])}
                    for row in connection.execute(
                        "SELECT id,created_at,question,language,result_json FROM reply_runs ORDER BY created_at DESC,id DESC LIMIT ?", (limit,))]
        finally:
            connection.close()


def local_store(request: Request):
    if os.getenv("HOMESTAY_LOCAL_DATA") != "1" or not request.client or request.client.host not in ("127.0.0.1", "::1"):
        raise HTTPException(404, "Local data is disabled")
    return FactStore(Path(os.getenv("HOMESTAY_LOCAL_DB", str(Path(__file__).resolve().parents[1] / "data" / "local.sqlite3"))))


router = APIRouter(prefix="/v1/local")


@router.get("/facts")
def read_facts(store: FactStore = Depends(local_store)):
    return {"facts": store.read()}


@router.put("/facts")
def save_facts(values: SavedFacts, store: FactStore = Depends(local_store)):
    store.save(values)
    return {"facts": store.read()}


@router.post("/reply-decision")
async def local_reply(question: LocalQuestion, store: FactStore = Depends(local_store)):
    result = await generate_reply(ReplyDecisionRequest(**question.model_dump(), facts=store.read()))
    store.record_reply(question.question, question.language, result)
    return result


@router.get("/reply-history")
def reply_history(store: FactStore = Depends(local_store)):
    return {"items": store.reply_history()}
