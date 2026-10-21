"""Local fictional reservation snapshot. Cleaning never checks a guest in."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .local_facts import FactStore, local_store

SNAPSHOT_DATE = "2026-09-17"
router = APIRouter(prefix="/v1/local")


def migrate_rooms(connection):
    connection.execute("""CREATE TABLE demo_rooms (
        number TEXT PRIMARY KEY, floor TEXT NOT NULL, room_type TEXT NOT NULL,
        housekeeping TEXT NOT NULL CHECK(housekeeping IN ('clean','dirty')),
        updated_at TEXT NOT NULL
    )""")
    connection.execute("""CREATE TABLE demo_reservations (
        id TEXT PRIMARY KEY, guest TEXT NOT NULL, room_number TEXT NOT NULL REFERENCES demo_rooms(number),
        check_in TEXT NOT NULL, check_out TEXT NOT NULL,
        amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0), currency TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('confirmed','checked_in','checked_out','cancelled')),
        CHECK(check_out > check_in)
    )""")
    numbers = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205"]
    connection.executemany("INSERT INTO demo_rooms VALUES (?,?,?,?,?)", [
        (number, number[0], "double", "dirty" if number in ("102", "201") else "clean", "2026-09-17T11:00:00+08:00")
        for number in numbers])
    # All names and bookings are fictional; amounts are integer CNY cents.
    connection.executemany("INSERT INTO demo_reservations VALUES (?,?,?,?,?,?,?,?)", [
        ("demo-102", "Taylor", "102", "2026-09-17", "2026-09-19", 104000, "CNY", "confirmed"),
        ("demo-103", "Morgan", "103", "2026-09-16", "2026-09-18", 104000, "CNY", "checked_in"),
        ("demo-104", "Casey", "104", "2026-09-16", "2026-09-19", 156000, "CNY", "checked_in"),
        ("demo-105", "Avery", "105", "2026-09-16", "2026-09-18", 104000, "CNY", "checked_in"),
        ("demo-201", "Jamie", "201", "2026-09-15", "2026-09-17", 104000, "CNY", "checked_out"),
        ("demo-202", "Jordan", "202", "2026-09-16", "2026-09-20", 208000, "CNY", "checked_in"),
        ("demo-203", "Sam", "203", "2026-09-16", "2026-09-18", 104000, "CNY", "checked_in"),
        ("demo-204", "Riley", "204", "2026-09-16", "2026-09-19", 156000, "CNY", "checked_in"),
        ("demo-205", "Alexis", "205", "2026-09-16", "2026-09-20", 208000, "CNY", "checked_in"),
    ])
    connection.execute("CREATE INDEX demo_reservations_room_dates ON demo_reservations(room_number,check_in,check_out)")


def occupied(connection, number):
    return connection.execute("""SELECT check_out FROM demo_reservations
        WHERE room_number=? AND status='checked_in' AND check_in<=? AND check_out>?
        ORDER BY check_out DESC LIMIT 1""", (number, SNAPSHOT_DATE, SNAPSHOT_DATE)).fetchone()


def read_board(connection):
    items = []
    for number, floor, room_type, housekeeping in connection.execute(
            "SELECT number,floor,room_type,housekeeping FROM demo_rooms ORDER BY floor,number"):
        stay = occupied(connection, number)
        status = "occupied" if stay else "cleaning" if housekeeping == "dirty" else "ready"
        arrival = connection.execute("""SELECT check_in FROM demo_reservations
            WHERE room_number=? AND status='confirmed' AND check_in>=? ORDER BY check_in LIMIT 1""",
            (number, SNAPSHOT_DATE)).fetchone()
        items.append({"number": number, "floor": floor, "room_type": room_type,
            "housekeeping": housekeeping, "status": status,
            "departure": stay[0] if stay else None, "next_arrival": arrival[0] if arrival else None})
    return {"sample": True, "snapshot_date": SNAPSHOT_DATE, "items": items,
        "counts": {state: sum(item["status"] == state for item in items) for state in ("ready", "cleaning", "occupied")}}


class CleanRoom(BaseModel):
    model_config = ConfigDict(extra="forbid")
    room_number: str = Field(pattern=r"^\d{3}$")


@router.get("/room-board")
def room_board(store: FactStore = Depends(local_store)):
    connection = store.connect()
    try:
        # All rooms, orders and counts come from one consistent read snapshot.
        connection.execute("BEGIN")
        return read_board(connection)
    finally:
        connection.close()


@router.post("/room-clean")
def clean_room(body: CleanRoom, store: FactStore = Depends(local_store)):
    connection = store.connect()
    try:
        with connection:
            connection.execute("BEGIN IMMEDIATE")
            if not connection.execute("SELECT 1 FROM demo_rooms WHERE number=?", (body.room_number,)).fetchone():
                raise HTTPException(404, "Unknown sample room")
            if occupied(connection, body.room_number):
                raise HTTPException(409, "Occupied room cannot become ready")
            connection.execute("UPDATE demo_rooms SET housekeeping='clean',updated_at=? WHERE number=?",
                (datetime.now(timezone.utc).isoformat(), body.room_number))
            result = read_board(connection)
        return result
    finally:
        connection.close()
