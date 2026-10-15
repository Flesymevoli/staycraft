"""Read-only advice for sample booking exceptions; never changes an order or payment."""

from .contracts import EarlyCheckinAdviceRequest, OperationAdvice, RefundAdviceRequest


def advise_operation(request: EarlyCheckinAdviceRequest | RefundAdviceRequest) -> OperationAdvice:
    if isinstance(request, EarlyCheckinAdviceRequest):
        basis = [
            f"standard_checkin={request.standard_time.strftime('%H:%M')}",
            f"requested_checkin={request.requested_time.strftime('%H:%M')}",
        ]
        if request.requested_time >= request.standard_time:
            return OperationAdvice(
                kind="early_checkin", recommended_action="keep_standard_time",
                reason_code="not_early", basis=basis, missing_checks=[],
            )
        if request.cleaning_ready is False or request.room_available is False:
            return OperationAdvice(
                kind="early_checkin", recommended_action="keep_standard_time",
                reason_code="room_not_ready", basis=basis, missing_checks=[],
            )
        missing = []
        if request.cleaning_ready is None:
            missing.append("cleaning_ready")
        if request.room_available is None:
            missing.append("room_available")
        if missing:
            return OperationAdvice(
                kind="early_checkin", recommended_action="verify_readiness",
                reason_code="missing_confirmation", basis=basis, missing_checks=missing,
            )
        return OperationAdvice(
            kind="early_checkin", recommended_action="consider_early_checkin",
            reason_code="ready_for_owner", basis=basis, missing_checks=[],
        )

    days_before_arrival = (request.arrival_on - request.requested_on).days
    basis = [
        f"days_before_arrival={days_before_arrival}",
        f"full_refund_min_days={request.full_refund_min_days}",
        f"paid_amount_yuan={request.paid_amount_yuan}",
    ]
    if not request.payment_confirmed:
        return OperationAdvice(
            kind="refund", recommended_action="review_refund", reason_code="payment_unconfirmed",
            basis=basis, missing_checks=["payment_confirmation"],
        )
    if days_before_arrival < request.full_refund_min_days:
        return OperationAdvice(
            kind="refund", recommended_action="review_refund", reason_code="outside_policy",
            basis=basis, missing_checks=[],
        )
    return OperationAdvice(
        kind="refund", recommended_action="propose_full_refund", reason_code="within_policy",
        basis=basis, missing_checks=[], suggested_refund_yuan=request.paid_amount_yuan,
    )
