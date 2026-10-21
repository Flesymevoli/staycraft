"""Read-only demo calendar using the same reservation dates as room operations."""
from fastapi import APIRouter, Depends
from .local_facts import FactStore, local_store
from .room_service import SNAPSHOT_DATE

router=APIRouter(prefix="/v1/local")


@router.get("/schedule")
def schedule(store: FactStore=Depends(local_store)):
    db=store.connect()
    try:
        db.execute("BEGIN")
        standard=db.execute("SELECT value FROM facts WHERE key='checkin'").fetchone()
        items=[]
        for identifier, room, checkin, checkout, status in db.execute("SELECT id,room_number,check_in,check_out,status FROM demo_reservations WHERE status!='cancelled'"):
            for kind, on in (("checkout",checkout),("checkin",checkin)):
                if not "2026-09-14" <= on <= "2026-09-30":
                    continue
                policy_time=standard[0] if kind=="checkin" and status=="confirmed" and on>=SNAPSHOT_DATE and standard else None
                items.append({"id":identifier+":"+kind,"order_id":identifier,"room":room,"kind":kind,"date":on,
                    "time":policy_time,"time_basis":"standard_policy" if policy_time else "not_recorded"})
        items.sort(key=lambda item:(item["date"],0 if item["kind"]=="checkout" else 1,item["room"]))
        return {"sample":True,"source":"local_reservations","start":"2026-09-14","end":"2026-09-30","items":items}
    finally:
        db.close()
