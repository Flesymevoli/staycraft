"""Existing promotion generator backed by fictional context and explicit local save."""
import asyncio
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .analysis_service import sample_metrics
from .local_facts import FactStore, local_store

router=APIRouter(prefix="/v1/local")
Channel=Literal["xiaohongshu","wechat"]
Context=Literal["market","walk"]
Language=Literal["en","zh"]


class PromotionRequest(BaseModel):
    model_config=ConfigDict(extra="forbid")
    channel: Channel="xiaohongshu"
    context: Context="market"
    language: Language="en"


class SavePromotion(PromotionRequest):
    content: str=Field(min_length=1,max_length=4000)

    @field_validator("content")
    @classmethod
    def trim_content(cls,value):
        if not value.strip():
            raise ValueError("Content cannot be blank")
        return value.strip()


def draft_key(request):
    return f"{request.context}:{request.channel}:{request.language}"


def rule_content(request):
    zh=request.language=="zh"
    topic=("湖畔周末市集" if request.context=="market" else "村落晨间漫步") if zh else ("lakeside weekend market" if request.context=="market" else "village morning walk")
    if zh:
        text=f"周边线索：{topic}（示例），发布前需核实活动或路线信息。\n\n给旅行留一点从容。提前抵达花园民宿，享受安静的工作日小住，再慢慢探索周边。具体可订日期和房价欢迎咨询。"
        if request.channel=="xiaohongshu":
            text="标题：给工作日，留一场慢旅行\n\n"+text+"\n\n#民宿小住 #工作日旅行 #周边游\n\n配图建议：民宿实景与核实后的周边地点。"
    else:
        text=f"Local idea: {topic} (sample). Verify event or route details before publishing.\n\nEnjoy a quieter weekday stay at Garden House and explore at your own pace. Ask about available dates and rates."
        if request.channel=="xiaohongshu":
            text="Title: Leave room for a slower escape\n\n"+text+"\n\n#WeekdayEscape #LocalTravel\n\nPhoto ideas: property photos and verified nearby places."
    return {"content":text,"engine":"rules_v1","reason":"model_disabled"}


async def generate_promotion(store, request, transport=None):
    result=rule_content(request)
    if os.getenv("MODEL_ENABLED")!="1":
        return result
    key=os.getenv("MODEL_API_KEY","");base=os.getenv("MODEL_BASE_URL","").rstrip("/");model=os.getenv("MODEL_NAME","")
    result["reason"]="model_unavailable"
    if not key or not model or urlparse(base).scheme!="https":
        return result
    context={"sample":True,"property":"Garden House, a fictional quiet garden homestay", "idea":"fictional lakeside weekend market" if request.context=="market" else "fictional village morning walk",
        "channel":request.channel,"metrics":sample_metrics(7),"confirmed_time_facts":[{"key":f.key,"value":f.value} for f in store.read()]}
    fingerprint="promotion:"+hashlib.sha256(json.dumps({"version":1,"request":request.model_dump(),"context":context,"model":model,"base":base},sort_keys=True).encode()).hexdigest()
    connection=store.connect()
    try:
        connection.execute("BEGIN IMMEDIATE")
        cached=connection.execute("SELECT result_json,created_at FROM summary_cache WHERE fingerprint=?",(fingerprint,)).fetchone()
        if cached:
            age=(datetime.now(timezone.utc)-datetime.fromisoformat(cached[1])).total_seconds()
            if cached[0]:
                stored=json.loads(cached[0])
                if stored["engine"]=="model_v1" or age<300:
                    connection.rollback();return stored
            elif age<35:
                connection.rollback();result["reason"]="preparing";return result
        connection.execute("INSERT INTO summary_cache VALUES (?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET result_json=NULL,created_at=excluded.created_at",(fingerprint,None,datetime.now(timezone.utc).isoformat()))
        connection.commit()
    finally:
        connection.close()
    payload={"model":model,"max_tokens":700,"stream":False,"messages":[
        {"role":"system","content":"Write a short promotional DRAFT for a fictional homestay using ONLY the supplied context. Return JSON {\"content\":\"...\"}. Under 1200 characters. Do not invent dates, prices, discounts, URLs, services, guarantees, availability, travel times or confirmed event details. Do not include any numeric figures: metrics are context only. Say the local idea is a sample that needs verification before publishing. For xiaohongshu add a title and a few hashtags; for wechat keep it brief. No publication or sending occurs. Language: "+("Chinese." if request.language=="zh" else "English.")},
        {"role":"user","content":json.dumps(context,ensure_ascii=False)}]}
    if urlparse(base).hostname=="api.deepseek.com":
        payload["thinking"]={"type":"disabled"}
    try:
        async with httpx.AsyncClient(timeout=20,transport=transport,follow_redirects=False) as client:
            response=await asyncio.wait_for(client.post(base+"/chat/completions",headers={"Authorization":"Bearer "+key},json=payload),timeout=20)
            response.raise_for_status();choice=response.json()["choices"][0]
            content=json.loads(choice["message"]["content"]).get("content")
            if choice.get("finish_reason")=="stop" and isinstance(content,str) and 1<=len(content.strip())<=1200 and not re.search(r"\d|https?://",content):
                result={"content":content.strip(),"engine":"model_v1","reason":"ready"}
    except (httpx.HTTPError,TimeoutError,ValueError,TypeError,KeyError,IndexError,AttributeError):
        pass
    connection=store.connect()
    try:
        with connection:
            connection.execute("UPDATE summary_cache SET result_json=? WHERE fingerprint=?",(json.dumps(result,ensure_ascii=False),fingerprint))
    finally:
        connection.close()
    return result


@router.post("/promotion-generate")
async def promotion_generate(request: PromotionRequest, store: FactStore=Depends(local_store)):
    return await generate_promotion(store,request)


@router.get("/promotion-draft")
def read_promotion(channel: Channel=Query("xiaohongshu"), context: Context=Query("market"), language: Language=Query("en"), store: FactStore=Depends(local_store)):
    request=PromotionRequest(channel=channel,context=context,language=language)
    connection=store.connect()
    try:
        row=connection.execute("SELECT content,updated_at FROM promotion_drafts WHERE id=?",(draft_key(request),)).fetchone()
        return {"content":row[0] if row else "","updated_at":row[1] if row else None,"published":False}
    finally:
        connection.close()


@router.put("/promotion-draft")
def save_promotion(request: SavePromotion, store: FactStore=Depends(local_store)):
    connection=store.connect()
    try:
        with connection:
            connection.execute("INSERT INTO promotion_drafts VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at",(draft_key(request),request.content,datetime.now(timezone.utc).isoformat()))
        return {"content":request.content,"saved":True,"published":False}
    finally:
        connection.close()
