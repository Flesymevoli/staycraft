"""Local fictional conversations; saved replies never leave this database."""
import hashlib
import json
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .contracts import ReplyDecisionRequest
from .local_facts import FactStore, local_store
from .model_service import generate_reply

ThreadId = Literal["breakfast", "transfer"]
router = APIRouter(prefix="/v1/local")


def thread_data(store, thread_id):
    connection=store.connect()
    try:
        row=connection.execute("SELECT id,guest,room FROM demo_threads WHERE id=?", (thread_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Conversation not found")
        messages=[dict(zip(("id","sender","body_en","body_zh","created_at"), item)) for item in connection.execute(
            "SELECT id,sender,body_en,body_zh,created_at FROM demo_messages WHERE thread_id=? ORDER BY created_at,id", (thread_id,))]
        draft=connection.execute("SELECT state,result_json,updated_at FROM demo_drafts WHERE thread_id=?", (thread_id,)).fetchone()
        if draft and draft[0]=="processing" and (datetime.now(timezone.utc)-datetime.fromisoformat(draft[2])).total_seconds()>35:
            with connection:
                connection.execute("UPDATE demo_drafts SET state='failed' WHERE thread_id=?", (thread_id,))
            draft=("failed",None,draft[2])
        return {"id":row[0],"guest":row[1],"room":row[2],"messages":messages,
                "draft_state":draft[0] if draft else "idle", "decision":json.loads(draft[1]) if draft and draft[1] else None}
    finally:
        connection.close()


@router.get("/conversations")
def conversations(store: FactStore = Depends(local_store)):
    return {"items":[thread_data(store, key) for key in ("breakfast","transfer")]}


@router.get("/conversation")
def conversation(thread_id: ThreadId, store: FactStore = Depends(local_store)):
    return thread_data(store, thread_id)


class DraftRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    thread_id: ThreadId
    language: Literal["en","zh"]="en"
    auto_reply_enabled: bool=False


@router.post("/conversation-draft")
async def conversation_draft(request: DraftRequest, store: FactStore = Depends(local_store)):
    thread=thread_data(store,request.thread_id)
    if any(message["sender"]=="owner" for message in thread["messages"]):
        return thread
    facts=store.read()
    fingerprint=hashlib.sha256(json.dumps({"facts":[{"key":f.key,"value":f.value,"status":f.status} for f in facts],
        "language":request.language,"auto":request.auto_reply_enabled},sort_keys=True).encode()).hexdigest()
    connection=store.connect()
    try:
        connection.execute("BEGIN IMMEDIATE")
        cached=connection.execute("SELECT state,fingerprint FROM demo_drafts WHERE thread_id=?",(request.thread_id,)).fetchone()
        if cached and (cached[0]=="processing" or cached[1]==fingerprint):
            connection.rollback()
            return thread_data(store,request.thread_id)
        connection.execute("INSERT INTO demo_drafts VALUES (?,?,?,?,?) ON CONFLICT(thread_id) DO UPDATE SET state=excluded.state,result_json=NULL,fingerprint=excluded.fingerprint,updated_at=excluded.updated_at",
            (request.thread_id,"processing",None,fingerprint,datetime.now(timezone.utc).isoformat()))
        connection.commit()
    finally:
        connection.close()
    guest=next(message for message in thread["messages"] if message["sender"]=="guest")
    try:
        result=await generate_reply(ReplyDecisionRequest(question=guest["body_zh" if request.language=="zh" else "body_en"],
                language=request.language,auto_reply_enabled=request.auto_reply_enabled,facts=facts))
        store.record_reply(guest["body_en"],request.language,result)
        connection=store.connect()
        try:
            with connection:
                connection.execute("UPDATE demo_drafts SET state='ready',result_json=?,updated_at=? WHERE thread_id=?",
                    (result.model_dump_json(),datetime.now(timezone.utc).isoformat(),request.thread_id))
        finally:
            connection.close()
    except Exception:
        connection=store.connect()
        try:
            with connection:
                connection.execute("UPDATE demo_drafts SET state='failed' WHERE thread_id=?",(request.thread_id,))
        finally:
            connection.close()
        raise HTTPException(503,"Draft processing failed") from None
    return thread_data(store,request.thread_id)


class OwnerReply(BaseModel):
    model_config=ConfigDict(extra="forbid")
    thread_id: ThreadId
    request_id: UUID
    body: str=Field(min_length=1,max_length=2000)

    @field_validator("body")
    @classmethod
    def trim_body(cls,value):
        if not value.strip():
            raise ValueError("Reply cannot be blank")
        return value.strip()


@router.post("/conversation-reply")
def conversation_reply(request: OwnerReply, store: FactStore=Depends(local_store)):
    connection=store.connect()
    try:
        connection.execute("BEGIN IMMEDIATE")
        existing=connection.execute("SELECT thread_id,body_en FROM demo_messages WHERE request_id=?",(str(request.request_id),)).fetchone()
        if existing:
            connection.rollback()
            if existing!=(request.thread_id,request.body):
                raise HTTPException(409,"Reply identifier already used")
            return thread_data(store,request.thread_id)
        pending=connection.execute("SELECT state FROM demo_drafts WHERE thread_id=?",(request.thread_id,)).fetchone()
        if pending and pending[0]=="processing":
            raise HTTPException(409,"Draft still processing")
        connection.execute("INSERT INTO demo_messages VALUES (?,?,?,?,?,?,?)",(str(uuid4()),request.thread_id,"owner",request.body,request.body,datetime.now(timezone.utc).isoformat(),str(request.request_id)))
        connection.commit()
    finally:
        connection.close()
    return thread_data(store,request.thread_id)
