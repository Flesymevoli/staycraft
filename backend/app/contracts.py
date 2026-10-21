"""HTTP contracts for the first guest-message decision flow."""

from datetime import date, datetime, time
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
        "model_review",
        "model_unavailable",
    ]
    citations: list[FactCitation]
    engine: Literal["rules_v1", "model_v1"] = "rules_v1"
    sent: Literal[False] = False


class EarlyCheckinAdviceRequest(BaseModel):
    kind: Literal["early_checkin"]
    standard_time: time
    requested_time: time
    cleaning_ready: bool | None = None
    room_available: bool | None = None


class RefundAdviceRequest(BaseModel):
    kind: Literal["refund"]
    requested_on: date
    arrival_on: date
    paid_amount_yuan: int = Field(gt=0)
    payment_confirmed: bool
    full_refund_min_days: int = Field(ge=0, le=365)


class OperationAdvice(BaseModel):
    kind: Literal["early_checkin", "refund"]
    recommended_action: Literal["verify_readiness", "consider_early_checkin", "keep_standard_time", "propose_full_refund", "review_refund"]
    reason_code: Literal["missing_confirmation", "room_not_ready", "not_early", "ready_for_owner", "within_policy", "outside_policy", "payment_unconfirmed"]
    basis: list[str]
    missing_checks: list[str]
    suggested_refund_yuan: int | None = None
    requires_owner_decision: Literal[True] = True
    external_status: Literal["not_started"] = "not_started"
    engine: Literal["sample_rules_v1"] = "sample_rules_v1"
