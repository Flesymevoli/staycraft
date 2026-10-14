"""HTTP contracts for the first guest-message decision flow."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


FactStatus = Literal["confirmed", "draft"]
Disposition = Literal["auto_reply_ready", "needs_review"]


class PropertyFact(BaseModel):
    key: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=200)
    status: FactStatus
    updated_at: datetime | None = None

    @field_validator("key", "value")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("fact fields cannot be blank")
        return value


class ReplyDecisionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "zh"] = "en"
    auto_reply_enabled: bool = False
    facts: list[PropertyFact] = Field(default_factory=list, max_length=100)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question cannot be blank")
        return value


class FactCitation(BaseModel):
    key: str
    value: str
    updated_at: datetime | None = None


class ReplyDecision(BaseModel):
    disposition: Disposition
    draft: str | None
    reason_code: Literal[
        "ready",
        "auto_reply_off",
        "missing_fact",
        "needs_confirmation",
        "sensitive_request",
        "unsupported_question",
    ]
    citations: list[FactCitation]
    engine: Literal["rules_v1"] = "rules_v1"
    sent: Literal[False] = False
