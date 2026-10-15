"""First read-only decision API. It never sends a guest message."""

from uuid import UUID

from fastapi import Depends, FastAPI

from .access import PropertyAccess, require_property_access

from .contracts import ReplyDecision, ReplyDecisionRequest
from .reply_service import decide_reply

app = FastAPI(title="Homestay AI Assistant API", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/reply-decisions", response_model=ReplyDecision)
async def reply_decision(request: ReplyDecisionRequest) -> ReplyDecision:
    return decide_reply(request)


@app.get("/v1/properties/{property_id}/access")
async def property_access(
    property_id: UUID,
    access: PropertyAccess = Depends(require_property_access),
) -> dict[str, str]:
    return {
        "property_id": str(access.property_id),
        "role": access.role,
    }
