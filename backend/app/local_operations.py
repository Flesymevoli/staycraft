"""Fictional booking requests and owner plans. No external execution is possible."""
import hashlib
import json
import sqlite3
from datetime import date, datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from .contracts import EarlyCheckinAdviceRequest
from .local_facts import FactStore, local_store
from .operation_service import advise_operation
from .room_service import SNAPSHOT_DATE, occupied

router = APIRouter(prefix="/v1/local")


def migrate_operations(db):
    db.execute("""CREATE TABLE operation_requests (
        id TEXT PRIMARY KEY, reservation_id TEXT NOT NULL, kind TEXT NOT NULL,
        requested_on TEXT NOT NULL, requested_time TEXT,
        paid_cents INTEGER, payment_confirmed INTEGER NOT NULL DEFAULT 0,
        full_refund_min_days INTEGER
    )""")
    db.execute("""CREATE TABLE operation_decisions (
        operation_id TEXT PRIMARY KEY, decision TEXT NOT NULL, request_id TEXT NOT NULL UNIQUE,
        fingerprint TEXT NOT NULL, advice_json TEXT NOT NULL, created_at TEXT NOT NULL
    )""")
    db.executemany("INSERT INTO operation_requests VALUES (?,?,?,?,?,?,?,?)", [
        ("arrival", "demo-102", "early_checkin", SNAPSHOT_DATE, "12:00", None, 0, None),
        ("refund", "future-204", "refund", SNAPSHOT_DATE, None, 104000, 1, 3),
    ])


def request_context(db, operation_id):
    db.row_factory = sqlite3.Row
    request = db.execute("SELECT * FROM operation_requests WHERE id=?", (operation_id,)).fetchone()
    if not request:
        raise HTTPException(404, "Unknown sample request")
    order = db.execute("SELECT * FROM demo_reservations WHERE id=?", (request["reservation_id"],)).fetchone()
    if not order:
        raise HTTPException(409, "Associated order unavailable")
    standard = db.execute("SELECT value,updated_at FROM facts WHERE key='checkin'").fetchone()
    room = db.execute("SELECT housekeeping,updated_at FROM demo_rooms WHERE number=?", (order["room_number"],)).fetchone()
    return {"request": dict(request), "order": dict(order), "standard": dict(standard) if standard else None,
        "room": dict(room) if room else None, "occupied": bool(occupied(db, order["room_number"]))}


def operation_meta(context):
    request, order = context["request"], context["order"]
    return {"id": request["id"], "kind": request["kind"], "order_id": order["id"],
        "room": order["room_number"], "guest": order["guest"], "arrival_on": order["check_in"],
        "requested_on": request["requested_on"], "requested_time": request["requested_time"],
        "standard_time": context["standard"]["value"] if context["standard"] else None,
        "paid_amount_yuan": request["paid_cents"]/100 if request["payment_confirmed"] and request["paid_cents"] is not None else None}


def advice_snapshot(db, operation_id):
    context = request_context(db, operation_id)
    request, order = context["request"], context["order"]
    advice = {"kind": request["kind"], "recommended_action": "verify_readiness" if request["kind"] == "early_checkin" else "review_refund",
        "reason_code": "missing_confirmation", "basis": ["order_id="+order["id"]], "missing_checks": [],
        "suggested_refund_yuan": None, "requires_owner_decision": True, "external_status": "not_started", "engine": "sample_rules_v1"}
    if order["status"] != "confirmed":
        advice.update(reason_code="order_not_active", missing_checks=["order_status"])
    elif request["kind"] == "early_checkin":
        if not context["standard"]:
            advice.update(reason_code="missing_standard_time", missing_checks=["standard_checkin"])
        else:
            today = order["check_in"] == SNAPSHOT_DATE == request["requested_on"]
            checks = {"cleaning_ready": context["room"]["housekeeping"] == "clean" if today and context["room"] else None,
                "room_available": not context["occupied"] if today and context["room"] else None}
            result = advise_operation(EarlyCheckinAdviceRequest(kind="early_checkin", standard_time=context["standard"]["value"], requested_time=request["requested_time"], **checks))
            advice.update(result.model_dump())
            advice["basis"] = ["order_id="+order["id"], *advice["basis"]]
    else:
        days = (date.fromisoformat(order["check_in"])-date.fromisoformat(request["requested_on"])).days
        advice["basis"].append(f"days_before_arrival={days}")
        if request["full_refund_min_days"] is None:
            advice["missing_checks"].append("refund_policy")
        else:
            advice["basis"].append(f"full_refund_min_days={request['full_refund_min_days']}")
        if not request["payment_confirmed"] or request["paid_cents"] is None or not 0 < request["paid_cents"] <= order["amount_cents"] or order["currency"] != "CNY":
            advice["missing_checks"].append("payment_confirmation")
        else:
            advice["basis"].append(f"paid_amount_yuan={request['paid_cents']/100:.2f}")
        if not advice["missing_checks"]:
            if days >= request["full_refund_min_days"]:
                advice.update(recommended_action="propose_full_refund", reason_code="within_policy", suggested_refund_yuan=request["paid_cents"]/100)
            else:
                advice["reason_code"] = "outside_policy"
    fingerprint = hashlib.sha256(json.dumps(context, sort_keys=True).encode()).hexdigest()
    return {"operation": operation_meta(context), "advice": advice, "fingerprint": fingerprint}


def read_operations(db):
    items = [operation_meta(request_context(db, row[0])) for row in db.execute("SELECT id FROM operation_requests ORDER BY id").fetchall()]
    decisions = [{"id": row[0], "decision": row[1], "created_at": row[2], "external_status": "not_started"}
        for row in db.execute("SELECT operation_id,decision,created_at FROM operation_decisions ORDER BY created_at DESC")]
    return {"sample": True, "source": "local_reservations", "items": items, "decisions": decisions}


class AdviceQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Literal["arrival", "refund"]


class SaveDecision(AdviceQuery):
    decision: Literal["check_readiness", "consider_early", "keep_standard", "refund_proposed", "hold_review"]
    fingerprint: str
    request_id: UUID


@router.get("/operations")
def operations(store: FactStore = Depends(local_store)):
    db = store.connect()
    try:
        db.execute("BEGIN")
        return read_operations(db)
    finally:
        db.close()


@router.post("/operation-advice")
def local_advice(body: AdviceQuery, store: FactStore = Depends(local_store)):
    db = store.connect()
    try:
        db.execute("BEGIN")
        return advice_snapshot(db, body.id)
    finally:
        db.close()


@router.post("/operation-decision")
def record_decision(body: SaveDecision, store: FactStore = Depends(local_store)):
    db = store.connect()
    try:
        with db:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute("SELECT operation_id,decision,fingerprint FROM operation_decisions WHERE request_id=?", (str(body.request_id),)).fetchone()
            if existing:
                if tuple(existing) != (body.id, body.decision, body.fingerprint):
                    raise HTTPException(409, "Request ID already used")
                return read_operations(db)
            if db.execute("SELECT 1 FROM operation_decisions WHERE operation_id=?", (body.id,)).fetchone():
                raise HTTPException(409, "Plan already recorded; refresh the list")
            snapshot = advice_snapshot(db, body.id)
            if snapshot["fingerprint"] != body.fingerprint:
                raise HTTPException(409, "Facts changed; review the latest advice")
            action = snapshot["advice"]["recommended_action"]
            primary = {"verify_readiness":"check_readiness", "consider_early_checkin":"consider_early", "keep_standard_time":"keep_standard", "propose_full_refund":"refund_proposed", "review_refund":"hold_review"}[action]
            allowed = {primary, "keep_standard"} if body.id == "arrival" else {primary, "hold_review"}
            if body.decision not in allowed:
                raise HTTPException(409, "Decision does not match current advice")
            db.execute("INSERT INTO operation_decisions VALUES (?,?,?,?,?,?)", (body.id, body.decision, str(body.request_id), body.fingerprint, json.dumps(snapshot, ensure_ascii=False), datetime.now(timezone.utc).isoformat()))
            return read_operations(db)
    finally:
        db.close()
