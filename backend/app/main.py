"""First read-only decision API. It never sends a guest message."""

from fastapi import FastAPI

from .contracts import ReplyDecision, ReplyDecisionRequest
from .reply_service import decide_reply

app = FastAPI(title="Homestay AI Assistant API", version="0.1.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/reply-decisions", response_model=ReplyDecision)
async def reply_decision(request: ReplyDecisionRequest) -> ReplyDecision:
    return decide_reply(request)
