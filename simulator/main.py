"""
simulator/main.py — standalone FastAPI network simulator (port 8001).
Maintains real in-memory node state. Endpoints perform actual state mutations.
"""
import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from simulator.event_generator import start_generator, stop_generator

app = FastAPI(title="Network Simulator", version="1.0.0")


# ── Node state ─────────────────────────────────────────────────────────────

class NodeState:
    def __init__(self, node_id: str):
        self.node_id = node_id
        self.status = "healthy"
        self.current_route = f"AS65001-AS6500{node_id[-1] if node_id[-1].isdigit() else '2'}"
        self.throttle_rate_mbps: Optional[float] = None
        self.last_action: Optional[str] = None
        self.action_history: list[dict] = []

    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "status": self.status,
            "current_route": self.current_route,
            "throttle_rate_mbps": self.throttle_rate_mbps,
            "last_action": self.last_action,
            "action_history": self.action_history[-10:],
        }


NODE_IDS = (
    [f"node-core-0{i}" for i in range(1, 6)]
    + [f"node-edge-0{i}" for i in range(1, 10)]
    + ["node-edge-10"]
    + [f"node-dist-0{i}" for i in range(1, 6)]
)

_nodes: dict[str, NodeState] = {nid: NodeState(nid) for nid in NODE_IDS}


def _get_node(node_id: str) -> NodeState:
    if node_id not in _nodes:
        _nodes[node_id] = NodeState(node_id)
    return _nodes[node_id]


def _log_action(node: NodeState, action: str) -> None:
    node.last_action = action
    node.action_history.append({
        "action": action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ── Request models ─────────────────────────────────────────────────────────

class RerouteRequest(BaseModel):
    node_id: str
    backup_route: str
    metric_adjustment: int = 100


class ThrottleRequest(BaseModel):
    node_id: str
    rate_limit_mbps: float
    duration_seconds: int = 300


class RestartRequest(BaseModel):
    node_id: str
    graceful: bool = True
    failover_first: bool = True


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.post("/network/reroute")
async def reroute(req: RerouteRequest):
    node = _get_node(req.node_id)
    previous_route = node.current_route
    node.current_route = req.backup_route
    node.status = "healthy"
    _log_action(node, f"rerouted to {req.backup_route} (metric +{req.metric_adjustment})")
    return {
        "success": True,
        "node_id": req.node_id,
        "new_route": req.backup_route,
        "previous_route": previous_route,
        "metric_adjustment": req.metric_adjustment,
    }


@app.post("/network/throttle")
async def throttle(req: ThrottleRequest):
    node = _get_node(req.node_id)
    node.throttle_rate_mbps = req.rate_limit_mbps
    _log_action(node, f"throttled to {req.rate_limit_mbps} Mbps for {req.duration_seconds}s")

    async def _remove_throttle():
        await asyncio.sleep(req.duration_seconds)
        node.throttle_rate_mbps = None
        _log_action(node, "throttle expired — restored full rate")

    asyncio.create_task(_remove_throttle())

    return {
        "success": True,
        "node_id": req.node_id,
        "throttle_applied": f"{req.rate_limit_mbps} Mbps for {req.duration_seconds}s",
    }


@app.post("/network/restart")
async def restart(req: RestartRequest):
    node = _get_node(req.node_id)
    node.status = "restarting"
    _log_action(node, f"restart initiated (graceful={req.graceful}, failover_first={req.failover_first})")
    start_ts = datetime.now(timezone.utc)

    async def _finish_restart():
        await asyncio.sleep(3)
        node.status = "healthy"
        _log_action(node, "restart complete — node healthy")

    asyncio.create_task(_finish_restart())

    downtime_ms = 3000 if not req.graceful else 1500
    return {
        "success": True,
        "node_id": req.node_id,
        "downtime_ms": downtime_ms,
        "graceful": req.graceful,
        "failover_first": req.failover_first,
    }


@app.get("/network/status/{node_id}")
async def node_status(node_id: str):
    return _get_node(node_id).to_dict()


@app.get("/network/nodes")
async def all_nodes():
    return {nid: n.to_dict() for nid, n in _nodes.items()}


@app.get("/health")
async def health():
    return {"status": "ok", "nodes": len(_nodes)}


# ── Lifespan ───────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await start_generator()


@app.on_event("shutdown")
async def shutdown():
    await stop_generator()
