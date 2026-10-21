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
from .reply_service import decide_reply


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
        connection = sqlite3.connect(self.path)
        version = connection.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1):
            connection.close()
            raise RuntimeError("Unsupported local database version; restore matching code or migrate explicitly")
        if version == 0:
            with connection:
                connection.execute("CREATE TABLE IF NOT EXISTS facts (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
                connection.execute("PRAGMA user_version = 1")
        return connection

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
def local_reply(question: LocalQuestion, store: FactStore = Depends(local_store)):
    return decide_reply(ReplyDecisionRequest(**question.model_dump(), facts=store.read()))
