"""Conservative, deterministic baseline before a model or channel is connected."""

import re

from .contracts import FactCitation, ReplyDecision, ReplyDecisionRequest


def _contains(question: str, terms: tuple[str, ...]) -> bool:
    return any(term in question for term in terms)


def decide_reply(request: ReplyDecisionRequest) -> ReplyDecision:
    question = request.question.casefold()
    zh = request.language == "zh"

    def review(reason: str, draft: str | None = None) -> ReplyDecision:
        return ReplyDecision(
            disposition="needs_review", reason_code=reason, draft=draft, citations=[]
        )

    # Potential promises or money movement are checked before ordinary fact lookup.
    if _contains(question, ("refund", "cancel", "退款", "退订", "取消", "赔偿")):
        return review("sensitive_request")
    flexible_checkin = _contains(question, ("check-in", "check in")) and _contains(
        question, ("early", "before", "earlier", "late", "later")
    )
    if flexible_checkin or _contains(question, ("提前入住", "延迟退房", "提早入住")):
        return review("needs_confirmation")
    if _contains(question, ("transfer", "pickup", "driver", "taxi", "接送", "司机", "打车")):
        draft = (
            "我可以帮您确认接送选项。请告知到达时间和行李情况，确认后再回复您。"
            if zh else
            "I can check transfer options. Please share your arrival time and luggage details; I will confirm availability before promising a service."
        )
        return review("needs_confirmation", draft)

    answer_type: str | None = None
    if _contains(question, ("breakfast", "早饭", "早餐")):
        answer_type = "breakfast"
    elif _contains(question, ("check-in", "check in", "入住时间", "几点入住")):
        answer_type = "checkin"

    if answer_type is None:
        return review("unsupported_question")

    asks_time = _contains(question, ("when", "time", "hours", "几点", "时间", "几时"))
    if not asks_time:
        return review("unsupported_question")

    # A draft fact, or competing confirmed values, must never become an automatic answer.
    confirmed = {
        fact.value for fact in request.facts
        if fact.key == answer_type and fact.status == "confirmed" and fact.value
    }
    if len(confirmed) != 1:
        return review("missing_fact")
    fact = next(
        fact for fact in request.facts
        if fact.key == answer_type and fact.status == "confirmed" and fact.value in confirmed
    )
    time_pattern = (
        r"\d{1,2}:\d{2}\s*[–—-]\s*\d{1,2}:\d{2}"
        if answer_type == "breakfast" else
        r"(?:\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))"
    )
    if not re.search(time_pattern, fact.value, re.IGNORECASE):
        return review("missing_fact")
    citation = FactCitation(key=fact.key, value=fact.value, updated_at=fact.updated_at)

    if answer_type == "breakfast":
        draft = f"早餐时间：{fact.value}。" if zh else f"Breakfast hours: {fact.value}."
    else:
        draft = f"常规入住时间：{fact.value}。" if zh else f"Standard check-in time: {fact.value}."

    if not request.auto_reply_enabled:
        return ReplyDecision(
            disposition="needs_review", reason_code="auto_reply_off",
            draft=draft, citations=[citation]
        )
    return ReplyDecision(
        disposition="auto_reply_ready", reason_code="ready",
        draft=draft, citations=[citation]
    )
