from fastapi import APIRouter, HTTPException
from db.audit_log import get_event_trace

router = APIRouter()


@router.get("/traces/{event_id}")
async def get_trace(event_id: str):
    trace = await get_event_trace(event_id)
    if not trace:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return trace
