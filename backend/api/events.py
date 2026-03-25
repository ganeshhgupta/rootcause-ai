import asyncio
import json
from datetime import datetime, timezone
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

# Global set of client queues — one per SSE connection
_clients: set[asyncio.Queue] = set()


def broadcast_event(event_payload: dict) -> None:
    """Called by the background pipeline to push events to all SSE clients."""
    for q in list(_clients):
        try:
            q.put_nowait(event_payload)
        except asyncio.QueueFull:
            pass  # drop oldest; client is too slow


@router.get("/events/stream")
async def event_stream():
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _clients.add(queue)

    async def generator():
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {"data": json.dumps(payload)}
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield {"comment": "keepalive"}
        except asyncio.CancelledError:
            pass
        finally:
            _clients.discard(queue)

    return EventSourceResponse(generator())
