"""Computed fictional metrics and optional cached narrative; never executes advice."""
import asyncio
import hashlib
import json
import os
from .model_headers import model_headers
import re
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, Query

from .local_facts import FactStore, local_store
from .operation_metrics import compute_metrics

router=APIRouter(prefix="/v1/local")
def sample_metrics(days: int, store: FactStore):
    return {**compute_metrics(store, days),
        "rate_yuan":520,"market_range_yuan":[460,590],"satisfaction":(5*32+4*8)/40,
        "rating_count":40,
        "external_context":"Fictional local event on September 26; demand is a separate sample signal, not measured occupancy.",
        "feedback_context":"Fictional breakfast feedback suggests reviewing variety; this is not an inferred customer quote."}


def fallback(language, metrics, reason):
    no_data = metrics["occupancy_pct"] is None
    weekday_opportunity = not no_data and metrics["weekday_pct"] < metrics["weekend_pct"]
    if language=="zh":
        observation = "暂无客房资料，暂时不能计算入住率。请先核实客房与订单资料。" if no_data else "周末比工作日更满，接下来可以把重点放在工作日的空房。" if weekday_opportunity else "工作日入住情况不弱于周末，可以按日期查看剩余空房，再选择推广时段。"
        paragraphs=[observation+"下周预订进度来自当前订单，没有历史快照，暂不判断预订是否加快。",
          "示例房价处在同类住宿的参考范围内，可以先评估有针对性的推广，再决定是否调整价格。客人整体评价不错，早餐方面可以先看看具体反馈，确认哪些地方值得改善。"]
    else:
        observation = "No room inventory is available, so occupancy cannot be calculated. Review the room and reservation records first." if no_data else "Weekends are busier than weekdays. Focus next on filling weekday availability." if weekday_opportunity else "Weekday occupancy is at least as strong as weekends. Review daily availability before choosing promotion dates."
        paragraphs=[observation+" Next week's bookings come from current orders; without a historical snapshot, no pace change is inferred.",
          "Your sample rate sits within the comparison range. Review a focused promotion before deciding on a price change. Guest ratings are positive overall; read the breakfast comments before choosing improvements."]
    return {"paragraphs":paragraphs,"engine":"rules_v1","reason":reason,"metrics":metrics}


async def build_summary(store, days, language, transport=None):
    metrics=sample_metrics(days, store)
    if metrics["occupancy_pct"] is None:
        return fallback(language,metrics,"no_data")
    enabled=os.getenv("MODEL_ENABLED")=="1"
    key=os.getenv("MODEL_API_KEY","")
    base=os.getenv("MODEL_BASE_URL","").rstrip("/")
    model=os.getenv("MODEL_NAME","")
    if not enabled:
        return fallback(language,metrics,"model_disabled")
    if not key or not model or urlparse(base).scheme!="https":
        return fallback(language,metrics,"model_unavailable")
    fingerprint=hashlib.sha256(json.dumps({"version":1,"language":language,"metrics":metrics,"base":base,"model":model},sort_keys=True).encode()).hexdigest()
    connection=store.connect()
    try:
        connection.execute("BEGIN IMMEDIATE")
        cached=connection.execute("SELECT result_json,created_at FROM summary_cache WHERE fingerprint=?",(fingerprint,)).fetchone()
        if cached:
            age=(datetime.now(timezone.utc)-datetime.fromisoformat(cached[1])).total_seconds()
            if cached[0]:
                result=json.loads(cached[0])
                if result["engine"]=="model_v1" or age<300:
                    connection.rollback();return result
            elif age<35:
                connection.rollback();return fallback(language,metrics,"preparing")
        connection.execute("INSERT INTO summary_cache VALUES (?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET result_json=NULL,created_at=excluded.created_at",
            (fingerprint,None,datetime.now(timezone.utc).isoformat()))
        connection.commit()
    finally:
        connection.close()
    result=fallback(language,metrics,"model_unavailable")
    payload={"model":model,"max_tokens":512,"stream":False,"messages":[
      {"role":"system","content":"Write a plain-language summary for a homestay owner using ONLY the supplied fictional metrics. Return JSON {\"paragraphs\":[\"...\",\"...\"]}. Exactly two paragraphs, each under 450 characters. Do not repeat any numeric figures or dates: the charts already show them. Explain the main observation, then a cautious next step. Do not invent causes, costs, discounts, guests, quotes or guaranteed outcomes. Suggestions never execute actions. Use "+("Chinese." if language=="zh" else "English.")},
      {"role":"user","content":json.dumps(metrics,ensure_ascii=False)}]}
    if urlparse(base).hostname=="api.deepseek.com":
        payload["thinking"]={"type":"disabled"}
    try:
        async with httpx.AsyncClient(timeout=20,transport=transport,follow_redirects=False) as client:
            response=await asyncio.wait_for(client.post(base+"/chat/completions",headers=model_headers(key),json=payload),timeout=20)
            response.raise_for_status()
            choice=response.json()["choices"][0]
            content=json.loads(choice["message"]["content"])
            paragraphs=content.get("paragraphs")
            if choice.get("finish_reason")=="stop" and isinstance(paragraphs,list) and len(paragraphs)==2 and all(isinstance(p,str) and 1<=len(p.strip())<=450 and not re.search(r"\d",p) for p in paragraphs):
                result={"paragraphs":[p.strip() for p in paragraphs],"engine":"model_v1","reason":"ready","metrics":metrics}
    except (httpx.HTTPError,TimeoutError,ValueError,TypeError,KeyError,IndexError,AttributeError):
        pass
    connection=store.connect()
    try:
        with connection:
            connection.execute("UPDATE summary_cache SET result_json=? WHERE fingerprint=?",(json.dumps(result,ensure_ascii=False),fingerprint))
    finally:
        connection.close()
    return result


@router.get("/analysis-summary")
async def analysis_summary(days: Literal["7","28"]=Query("7"), language: Literal["en","zh"]=Query("en"), store: FactStore=Depends(local_store)):
    return await build_summary(store,int(days),language)
