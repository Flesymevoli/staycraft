"""Authenticated, grounded drafts for the website inbox. Never sends a message."""
import os
import re
from typing import Literal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, ConfigDict

from .access import PropertyAccess, SupabaseGateway, bearer, get_gateway, require_property_access
from .contracts import PropertyFact, ReplyDecision, ReplyDecisionRequest
from .model_service import generate_reply
from .reply_service import decide_reply

router = APIRouter(prefix="/v1/properties")


class CloudDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language: Literal["en", "zh"] = "zh"


def confirmed_facts(profile):
    """Read only the two explicit supported values; never send names/phones/notes."""
    facts = []
    clock = r"(?:[01]\d|2[0-3]):[0-5]\d"
    for key in ("breakfast", "checkin"):
        value = profile.get(key)
        pattern = clock + "–" + clock if key == "breakfast" else clock
        if isinstance(value, str) and re.fullmatch(pattern, value):
            if key == "breakfast" and value[:5] >= value[-5:]:
                continue
            facts.append(PropertyFact(key=key, value=value, status="confirmed"))
    return facts


async def prepare_cloud_draft(gateway, token, property_id, thread_id, language, writer=generate_reply):
    headers = {"apikey": gateway.publishable_key, "Authorization": "Bearer " + token}
    params = {"property_id": "eq." + str(property_id)}
    async with httpx.AsyncClient(base_url=gateway.url, headers=headers, timeout=7, transport=gateway.transport) as client:
        async def read(table, query):
            response = await client.get("/rest/v1/" + table, params={**params, **query})
            response.raise_for_status()
            rows = response.json()
            if not isinstance(rows, list):
                raise ValueError("Invalid data response")
            return rows

        messages = await read("messages", {"select": "id,sender,body", "conversation_id": "eq." + str(thread_id), "order": "created_at.desc,id.desc", "limit": "1"})
        if not messages:
            raise HTTPException(404, "conversation_not_found")
        latest = messages[0]
        if latest["sender"] != "guest":
            raise HTTPException(409, "conversation_changed")
        details = await read("property_details", {"select": "profile,revision", "limit": "1"})
        source_version = str(details[0]["revision"]) if details else "none"
        profile = details[0]["profile"] if details else {}
        allowed = os.getenv("FORMAL_MODEL_ENABLED") == "1" and os.getenv("MODEL_ENABLED") == "1"
        mode = "model_v1" if allowed else "rules_v1"
        existing = await read("reply_drafts", {"select": "id,decision,source_version,created_at,message_id", "conversation_id": "eq." + str(thread_id), "message_id": "eq." + latest["id"], "source_version": "eq." + source_version, "language": "eq." + language, "mode": "eq." + mode, "limit": "1"})
        if existing:
            # Validate the persisted decision rather than trusting arbitrary JSON.
            decision = ReplyDecision.model_validate(existing[0]["decision"])
        else:
            request = ReplyDecisionRequest(question=latest["body"], language=language, auto_reply_enabled=True, facts=confirmed_facts(profile))
            decision = await writer(request) if allowed else decide_reply(request)
        decision = decision.model_copy(update={"disposition": "needs_review", "sent": False})
        response = await client.post("/rest/v1/rpc/save_reply_draft", json={"p_property": str(property_id), "p_thread": str(thread_id), "p_message": latest["id"], "p_source_version": source_version, "p_language": language, "p_mode": mode, "p_decision": decision.model_dump(mode="json")})
        if response.is_error:
            message = response.json().get("message", "")
            if any(code in message for code in ("facts_changed", "conversation_changed")):
                raise HTTPException(409, "draft_context_changed")
            response.raise_for_status()
        saved = response.json()
        if not isinstance(saved, dict) or not saved.get("id"):
            raise ValueError("Draft not persisted")
        ReplyDecision.model_validate(saved["decision"])
        # Only the reviewable output and version are returned. No token or model keys.
        return {key: saved[key] for key in ("id", "decision", "source_version", "created_at", "message_id")}


@router.post("/{property_id}/conversations/{thread_id}/draft")
async def cloud_draft(property_id: UUID, thread_id: UUID, request: CloudDraftRequest,
                      access: PropertyAccess = Depends(require_property_access),
                      gateway: SupabaseGateway = Depends(get_gateway),
                      credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        return await prepare_cloud_draft(gateway, credentials.credentials, access.property_id, thread_id, request.language)
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(503, "draft_unavailable") from None
