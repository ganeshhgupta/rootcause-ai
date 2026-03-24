import os
import time
import json
import math
from groq import Groq
from agents.state import AgentState, AnomalySummary
from db.audit_log import insert_network_event, insert_agent_decision

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# Baseline distributions derived from realistic telecom P50 values
_BASELINES = {
    "latency_ms":       {"mean": 45.0,  "std": 12.0},
    "packet_loss_pct":  {"mean": 0.3,   "std": 0.15},
    "throughput_mbps":  {"mean": 850.0, "std": 120.0},
}


def _zscore(value: float, mean: float, std: float) -> float:
    return abs(value - mean) / std if std > 0 else 0.0


def _compute_anomaly(event: dict) -> AnomalySummary:
    z_latency = _zscore(event["latency_ms"], **_BASELINES["latency_ms"])
    z_loss = _zscore(event["packet_loss_pct"], **_BASELINES["packet_loss_pct"])
    z_throughput = _zscore(event["throughput_mbps"], **_BASELINES["throughput_mbps"])

    score = min(1.0, max(z_latency, z_loss, z_throughput) / 4.0)

    if score < 0.3:
        severity = "LOW"
    elif score < 0.6:
        severity = "MEDIUM"
    elif score < 0.8:
        severity = "HIGH"
    else:
        severity = "CRITICAL"

    flags: list[str] = []
    if z_latency > 2.0:
        ratio = event["latency_ms"] / _BASELINES["latency_ms"]["mean"]
        flags.append(f"latency {ratio:.1f}x above baseline ({event['latency_ms']:.0f}ms)")
    if z_loss > 2.0:
        flags.append(f"packet_loss {event['packet_loss_pct']:.2f}% exceeds 2σ threshold")
    if z_throughput > 2.0:
        ratio = _BASELINES["throughput_mbps"]["mean"] / max(event["throughput_mbps"], 1)
        flags.append(f"throughput degraded {ratio:.1f}x below baseline ({event['throughput_mbps']:.0f} Mbps)")

    return AnomalySummary(
        anomaly_score=round(score, 4),
        severity=severity,
        flags=flags,
        description="",
    )


async def monitor_agent(state: AgentState) -> AgentState:
    t0 = time.monotonic()
    event = state["event"]

    anomaly = _compute_anomaly(event)

    # LLM generates one-sentence natural language description
    prompt = (
        f"You are a telecom network monitoring agent. Summarize in ONE sentence what is "
        f"happening on node {event['node_id']}.\n\n"
        f"Metrics: latency={event['latency_ms']}ms, "
        f"packet_loss={event['packet_loss_pct']}%, "
        f"throughput={event['throughput_mbps']} Mbps\n"
        f"Anomaly score: {anomaly['anomaly_score']}, Severity: {anomaly['severity']}\n"
        f"Flags: {', '.join(anomaly['flags']) if anomaly['flags'] else 'none'}\n\n"
        f'Respond with JSON: {{"description": "<one sentence>"}}'
    )

    chat = _client.chat.completions.create(
        model=_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    raw = json.loads(chat.choices[0].message.content)
    anomaly["description"] = raw.get("description", f"Anomaly detected on {event['node_id']} with severity {anomaly['severity']}.")

    token_count = chat.usage.total_tokens if chat.usage else None
    latency_ms = int((time.monotonic() - t0) * 1000)

    # Persist network event
    event_id = await insert_network_event({
        "node_id": event["node_id"],
        "latency_ms": event["latency_ms"],
        "packet_loss_pct": event["packet_loss_pct"],
        "throughput_mbps": event["throughput_mbps"],
        "anomaly_score": anomaly["anomaly_score"],
        "severity": anomaly["severity"],
    })

    await insert_agent_decision({
        "event_id": event_id,
        "agent_name": "monitor",
        "input_state": {k: state["event"][k] for k in state["event"]},
        "output_state": dict(anomaly),
        "latency_ms": latency_ms,
        "token_count": token_count,
    })

    return {**state, "event_id": event_id, "anomaly_summary": anomaly}
