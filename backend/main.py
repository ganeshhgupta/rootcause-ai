import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.connection import init_pool, close_pool, run_migrations
from rag.corpus_builder import build_corpus
from observability.langsmith_setup import init_langsmith
from api.events import router as events_router, broadcast_event
from api.approvals import router as approvals_router
from api.traces import router as traces_router
from api.health import router as health_router
from tools.pubsub_client import subscribe_events
from agents.graph import run_event
from agents.state import NetworkEvent


async def _pipeline_loop() -> None:
    """Subscribe to Redis stream, run each event through the 3-agent graph, broadcast to SSE."""
    async for raw_event in subscribe_events():
        try:
            event = NetworkEvent(
                node_id=raw_event["node_id"],
                latency_ms=float(raw_event["latency_ms"]),
                packet_loss_pct=float(raw_event["packet_loss_pct"]),
                throughput_mbps=float(raw_event["throughput_mbps"]),
                timestamp=raw_event.get("timestamp", datetime.now(timezone.utc).isoformat()),
            )
            final_state, thread_id = await run_event(event)

            anomaly = final_state.get("anomaly_summary") or {}
            diagnosis = final_state.get("diagnosis") or {}
            plan = final_state.get("remediation_plan") or {}

            broadcast_event({
                "event_id": final_state.get("event_id"),
                "node_id": event["node_id"],
                "severity": anomaly.get("severity", "LOW"),
                "anomaly_score": anomaly.get("anomaly_score", 0),
                "diagnosis_summary": diagnosis.get("root_cause", ""),
                "action_type": plan.get("action_type", ""),
                "requires_approval": plan.get("requires_approval", False),
                "thread_id": thread_id,
                "timestamp": event["timestamp"],
            })
        except Exception as exc:
            print(f"[pipeline] Error processing event: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_pool()
    await run_migrations()
    init_langsmith()
    await build_corpus()

    pipeline_task = asyncio.create_task(_pipeline_loop())

    yield

    # Shutdown
    pipeline_task.cancel()
    try:
        await pipeline_task
    except asyncio.CancelledError:
        pass
    await close_pool()


app = FastAPI(title="RootCause AI", version="1.0.0", lifespan=lifespan)

_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(approvals_router)
app.include_router(traces_router)
app.include_router(health_router)
