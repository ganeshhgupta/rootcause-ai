"""
event_generator.py — generates synthetic network telemetry events and
publishes them to Upstash Redis Streams every 2 seconds.
Runs as a background asyncio task (non-blocking).
"""
import asyncio
import os
import json
import random
import sys
from datetime import datetime, timezone

import redis.asyncio as aioredis

_REDIS_URL = os.environ.get("UPSTASH_REDIS_URL")
if not _REDIS_URL:
    raise ValueError("UPSTASH_REDIS_URL environment variable is required but not set.")

STREAM_KEY = "network-events"

NODE_IDS = (
    [f"node-core-0{i}" for i in range(1, 6)]
    + [f"node-edge-0{i}" for i in range(1, 10)]
    + ["node-edge-10"]
    + [f"node-dist-0{i}" for i in range(1, 6)]
)

_task: asyncio.Task | None = None


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _generate_event(node_id: str) -> dict:
    anomalous = random.random() < 0.15

    if anomalous:
        pattern = random.choice(["latency_spike", "packet_loss_burst", "throughput_degradation", "combined"])
        if pattern == "latency_spike":
            latency = _clamp(random.gauss(200, 40), 5, 500)
            loss = _clamp(random.gauss(0.3, 0.15), 0, 20)
            throughput = _clamp(random.gauss(850, 120), 100, 1200)
        elif pattern == "packet_loss_burst":
            latency = _clamp(random.gauss(45, 12), 5, 500)
            loss = _clamp(random.gauss(8, 2), 0, 20)
            throughput = _clamp(random.gauss(850, 120), 100, 1200)
        elif pattern == "throughput_degradation":
            latency = _clamp(random.gauss(45, 12), 5, 500)
            loss = _clamp(random.gauss(0.3, 0.15), 0, 20)
            throughput = _clamp(random.gauss(150, 30), 100, 1200)
        else:  # combined
            latency = _clamp(random.gauss(200, 40), 5, 500)
            loss = _clamp(random.gauss(8, 2), 0, 20)
            throughput = _clamp(random.gauss(150, 30), 100, 1200)
    else:
        latency = _clamp(random.gauss(45, 12), 5, 500)
        loss = _clamp(random.gauss(0.3, 0.15), 0, 20)
        throughput = _clamp(random.gauss(850, 120), 100, 1200)

    return {
        "node_id": node_id,
        "latency_ms": round(latency, 2),
        "packet_loss_pct": round(loss, 4),
        "throughput_mbps": round(throughput, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def _generator_loop() -> None:
    r = aioredis.from_url(_REDIS_URL, decode_responses=True)
    try:
        while True:
            node_id = random.choice(NODE_IDS)
            event = _generate_event(node_id)
            await r.xadd(STREAM_KEY, {"payload": json.dumps(event)})
            await asyncio.sleep(2)
    except asyncio.CancelledError:
        pass
    finally:
        await r.aclose()


async def start_generator() -> None:
    global _task
    _task = asyncio.create_task(_generator_loop())


async def stop_generator() -> None:
    global _task
    if _task:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
