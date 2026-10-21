"""Room-night accounting from fictional reservation rows, never from AI output."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from typing import Literal

from .local_facts import FactStore, local_store
from .room_service import SNAPSHOT_DATE

router = APIRouter(prefix="/v1/local")
AS_OF = date.fromisoformat(SNAPSHOT_DATE)


def seed_metric_orders(db):
    """Append fictional fixture stays; never alter existing orders or room states."""
    rooms = [r[0] for r in db.execute("SELECT number FROM demo_rooms ORDER BY number")]
    if not rooms:
        return
    counts = [4,5,6,6,7,8,6, 5,5,6,6,7,9,6, 4,6,6,6,8,9,7, 6,7,9,10,4,5,8]
    first = AS_OF - timedelta(days=28)
    for index, target in enumerate(counts):
        day = first + timedelta(days=index)
        until = day + timedelta(days=1)
        existing = {r[0] for r in db.execute("SELECT room_number FROM demo_reservations WHERE status IN ('checked_in','checked_out') AND check_in<=? AND check_out>?", (day.isoformat(), day.isoformat()))}
        for number in rooms:
            if len(existing) >= min(target, len(rooms)):
                break
            if number in existing:
                continue
            db.execute("INSERT INTO demo_reservations VALUES (?,?,?,?,?,?,?,?)", (
                f"history-{day}-{number}", "Sample guest", number, day.isoformat(), until.isoformat(), 52000, "CNY", "checked_out"))
            existing.add(number)
    for number, start, end in [("101",21,25),("102",21,26),("103",21,24),("104",22,27),("105",23,28),("201",21,25),("202",25,28),("203",26,29),("204",27,29)]:
        if number in rooms:
            db.execute("INSERT INTO demo_reservations VALUES (?,?,?,?,?,?,?,?)", (
                f"future-{number}", "Sample future guest", number, f"2026-09-{start}", f"2026-09-{end}", (end-start)*52000, "CNY", "confirmed"))


def compute_metrics(store: FactStore, days: int):
    if days not in (7, 28):
        raise ValueError("Unsupported period")
    db = store.connect()
    try:
        db.execute("BEGIN")
        room_numbers = {r[0] for r in db.execute("SELECT number FROM demo_rooms")}
        orders = db.execute("SELECT room_number,check_in,check_out,status FROM demo_reservations").fetchall()
    finally:
        db.close()
    capacity = len(room_numbers)
    def occupied_on(day, states):
        # One room-night per room/date, even if input orders overlap.
        return len({number for number, start, end, status in orders
            if number in room_numbers and status in states and start <= day.isoformat() < end})
    def period(length, end):
        return [{"date": (day := end-timedelta(days=length-1-index)).isoformat(),
            "occupied_nights": occupied_on(day, {"checked_in", "checked_out"}),
            "capacity_nights": capacity, "weekend": day.weekday() >= 5}
            for index in range(length)]
    def percent(items):
        denominator = sum(item["capacity_nights"] for item in items)
        return round(sum(item["occupied_nights"] for item in items)*100/denominator) if denominator else None
    end = AS_OF-timedelta(days=1)
    daily = period(days, end)
    previous = period(days, end-timedelta(days=days)) if days == 7 else None
    # Prior 28-day coverage has not been seeded; don't invent a comparison.
    current_pct = percent(daily)
    previous_pct = percent(previous) if previous else None
    next_monday = AS_OF+timedelta(days=7-AS_OF.weekday())
    booked = sum(occupied_on(next_monday+timedelta(days=i), {"confirmed", "checked_in"}) for i in range(7))
    return {"sample": True, "source": "local_reservations", "as_of": AS_OF.isoformat(),
        "period_days": days, "period_start": daily[0]["date"], "period_end": end.isoformat(),
        "daily": [{**item, "value": round(item["occupied_nights"]*100/capacity) if capacity else None} for item in daily],
        "occupied_room_nights": sum(item["occupied_nights"] for item in daily),
        "capacity_room_nights": capacity*days, "occupancy_pct": current_pct,
        "weekday_pct": percent([item for item in daily if not item["weekend"]]),
        "weekend_pct": percent([item for item in daily if item["weekend"]]),
        "previous_occupancy_pct": previous_pct,
        "occupancy_change_pp": current_pct-previous_pct if current_pct is not None and previous_pct is not None else None,
        "next_week_start": next_monday.isoformat(), "next_week_end": (next_monday+timedelta(days=6)).isoformat(),
        "next_week_booked_nights": booked, "next_week_capacity_nights": capacity*7,
        "previous_booking_pace": None}


@router.get("/operation-metrics")
def operation_metrics(days: Literal["7", "28"] = Query("7"), store: FactStore = Depends(local_store)):
    return compute_metrics(store, int(days))
