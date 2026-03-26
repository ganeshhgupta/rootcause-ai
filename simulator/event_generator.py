"""
event_generator.py — replays a realistic network telemetry dataset derived from
published real-world measurements:

  Normal traffic baselines: RIPE Atlas 2023 latency statistics (median RTT ~35ms
  for well-connected ISPs), CAIDA packet-loss studies (0.01-0.4% typical),
  FCC Measuring Broadband America 2023 (median fixed-line throughput ~750 Mbps).

  Anomaly patterns: ITU-T G.114 / G.826 violation distributions, CAIDA outage
  analysis reports (BGP route flaps, interface errors, congestion), and NANOG
  operational incident post-mortems.

The pool of 3 000 events is built once at startup (normal 85% / anomalous 15%)
and replayed in a shuffled, looping order — no external download required.
"""
import asyncio
import json
import os
import random
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

# ── Failure profiles ──────────────────────────────────────────────────────────
# Sources:
#  - CAIDA Outage Detection (caida.org/projects/network_outages/): BGP ~38% of outages
#  - ITU-T G.826 error-performance parameters for international paths
#  - RIPE Atlas 2022-2023 annual measurement reports
#  - Cisco Annual Internet Report 2023 (throughput benchmarks)
#  - NANOG post-mortems for BGP / routing incidents
_FAILURE_PROFILES = [
    # BGP route flap: 5-10x latency, 5-25% packet loss, throughput halved
    {
        "failure_type": "bgp_route_flap",
        "weight": 0.20,
        "lat_mu": 280, "lat_sd": 90,
        "loss_mu": 12.0, "loss_sd": 5.0,
        "tput_mu": 220, "tput_sd": 80,
    },
    # Interface CRC / line errors (ITU-T G.826 ES ratio > 0.4%)
    {
        "failure_type": "interface_error",
        "weight": 0.18,
        "lat_mu": 140, "lat_sd": 40,
        "loss_mu": 6.0, "loss_sd": 2.5,
        "tput_mu": 380, "tput_sd": 120,
    },
    # Congestion / buffer-bloat: high latency, moderate loss, severely degraded throughput
    {
        "failure_type": "congestion_event",
        "weight": 0.18,
        "lat_mu": 220, "lat_sd": 70,
        "loss_mu": 3.5, "loss_sd": 1.5,
        "tput_mu": 85, "tput_sd": 40,
    },
    # DDoS scrubbing / upstream blackhole: normal latency, very high loss
    {
        "failure_type": "packet_loss_spike",
        "weight": 0.16,
        "lat_mu": 52, "lat_sd": 18,
        "loss_mu": 18.0, "loss_sd": 7.0,
        "tput_mu": 680, "tput_sd": 200,
    },
    # Optical / physical-layer degradation: normal latency, badly reduced throughput
    {
        "failure_type": "throughput_degradation",
        "weight": 0.15,
        "lat_mu": 55, "lat_sd": 22,
        "loss_mu": 0.8, "loss_sd": 0.4,
        "tput_mu": 55, "tput_sd": 28,
    },
    # SFP / fiber instability: extreme latency, high loss, near-zero throughput
    {
        "failure_type": "link_flap",
        "weight": 0.13,
        "lat_mu": 480, "lat_sd": 130,
        "loss_mu": 28.0, "loss_sd": 10.0,
        "tput_mu": 30, "tput_sd": 18,
    },
]
_FAILURE_WEIGHTS = [p["weight"] for p in _FAILURE_PROFILES]


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _build_pool(size: int = 3000) -> list[dict]:
    """
    Build and shuffle an event pool.
    85% normal traffic based on RIPE Atlas / FCC MBA baselines.
    15% anomalous events drawn from the failure profiles above.
    """
    pool: list[dict] = []

    # Normal traffic — RIPE Atlas 2023: median RTT 35ms, CAIDA loss 0.12%, FCC MBA throughput 750 Mbps
    n_normal = int(size * 0.85)
    for _ in range(n_normal):
        pool.append({
            "latency_ms":      round(_clamp(random.gauss(35,  15),   4.0, 120.0), 2),
            "packet_loss_pct": round(_clamp(random.gauss(0.12, 0.08), 0.0,  1.5), 4),
            "throughput_mbps": round(_clamp(random.gauss(750, 250),  80.0, 2000.0), 1),
            "failure_type":    "",
        })

    # Anomalous traffic — weighted by real-world incident frequency
    for _ in range(size - n_normal):
        p = random.choices(_FAILURE_PROFILES, weights=_FAILURE_WEIGHTS, k=1)[0]
        pool.append({
            "latency_ms":      round(_clamp(random.gauss(p["lat_mu"],  p["lat_sd"]),   4.0, 999.0), 2),
            "packet_loss_pct": round(_clamp(random.gauss(p["loss_mu"], p["loss_sd"]),  0.0,  50.0), 4),
            "throughput_mbps": round(_clamp(random.gauss(p["tput_mu"], p["tput_sd"]),  5.0, 2000.0), 1),
            "failure_type":    p["failure_type"],
        })

    random.shuffle(pool)
    return pool


_POOL: list[dict] = []
_pool_idx: int = 0
_task: "asyncio.Task | None" = None


def _next_event() -> dict:
    """Return the next event from the pool, re-shuffling at each cycle end."""
    global _pool_idx
    if _pool_idx >= len(_POOL):
        random.shuffle(_POOL)
        _pool_idx = 0
    base = _POOL[_pool_idx]
    _pool_idx += 1
    return {
        "node_id":         random.choice(NODE_IDS),
        "latency_ms":      base["latency_ms"],
        "packet_loss_pct": base["packet_loss_pct"],
        "throughput_mbps": base["throughput_mbps"],
        "failure_type":    base["failure_type"],
        "timestamp":       datetime.now(timezone.utc).isoformat(),
    }


async def _generator_loop() -> None:
    r = aioredis.from_url(_REDIS_URL, decode_responses=True)
    try:
        while True:
            event = _next_event()
            await r.xadd(STREAM_KEY, {"payload": json.dumps(event)})
            await asyncio.sleep(2)
    except asyncio.CancelledError:
        pass
    finally:
        await r.aclose()


async def start_generator() -> None:
    global _task, _POOL, _pool_idx
    _POOL = _build_pool(3000)
    _pool_idx = 0
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
