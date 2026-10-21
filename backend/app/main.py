"""First read-only decision API. It never sends a guest message."""

from uuid import UUID

from typing import Annotated

from fastapi import Body, Depends, FastAPI

from .access import PropertyAccess, require_property_access

from .contracts import (
    EarlyCheckinAdviceRequest, OperationAdvice, RefundAdviceRequest,
    ReplyDecision, ReplyDecisionRequest,
)
from .operation_service import advise_operation
from .reply_service import decide_reply
from .local_facts import router as local_router
from .conversations import router as conversations_router
from .analysis_service import router as analysis_router
from .promotion_service import router as promotion_router
from .room_service import router as room_router
from .operation_metrics import router as metrics_router
from .local_operations import router as operations_router
from .schedule_service import router as schedule_router

app = FastAPI(title="Homestay AI Assistant API", version="0.1.0")

app.include_router(local_router)
app.include_router(conversations_router)
app.include_router(analysis_router)
app.include_router(promotion_router)
app.include_router(room_router)
app.include_router(metrics_router)
app.include_router(operations_router)
app.include_router(schedule_router)

from .local_facts import router as local_router
app.include_router(local_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/reply-decisions", response_model=ReplyDecision)
async def reply_decision(request: ReplyDecisionRequest) -> ReplyDecision:
    return decide_reply(request)


@app.post("/v1/demo/operation-advice", response_model=OperationAdvice)
async def operation_advice(
    request: Annotated[EarlyCheckinAdviceRequest | RefundAdviceRequest, Body(discriminator="kind")],
) -> OperationAdvice:
    return advise_operation(request)


@app.get("/v1/properties/{property_id}/access")
async def property_access(
    property_id: UUID,
    access: PropertyAccess = Depends(require_property_access),
) -> dict[str, str]:
    return {
        "property_id": str(access.property_id),
        "role": access.role,
    }
