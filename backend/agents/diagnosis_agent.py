import os
import time
import json
from groq import Groq
from agents.state import AgentState, Diagnosis
from db.audit_log import insert_agent_decision
from rag.retriever import retrieve

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

VALID_FAILURE_TYPES = [
    "latency_spike", "packet_loss", "throughput_degradation",
    "node_failure", "bgp_instability", "dns_failure",
    "hardware_fault", "congestion", "ddos_attack", "misconfiguration",
]


async def diagnosis_agent(state: AgentState) -> AgentState:
    t0 = time.monotonic()
    event = state["event"]
    anomaly = state["anomaly_summary"]

    flags_str = ", ".join(anomaly["flags"]) if anomaly["flags"] else "no specific flags"
    query = (
        f"high {flags_str} on node {event['node_id']}, "
        f"latency {event['latency_ms']}ms packet_loss {event['packet_loss_pct']}% "
        f"throughput {event['throughput_mbps']}Mbps severity {anomaly['severity']}"
    )

    runbooks = await retrieve(query, top_k=5)
    context_parts = []
    for i, rb in enumerate(runbooks, 1):
        context_parts.append(
            f"[RUNBOOK {i}] {rb['title']} (type: {rb['failure_type']})\n{rb['content']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    prompt = f"""You are a telecom network diagnosis agent. Use ONLY the provided runbooks and event data.
Do not hallucinate failure types not listed in VALID_FAILURE_TYPES.

VALID_FAILURE_TYPES: {json.dumps(VALID_FAILURE_TYPES)}

EVENT DATA:
- Node: {event['node_id']}
- Latency: {event['latency_ms']}ms
- Packet Loss: {event['packet_loss_pct']}%
- Throughput: {event['throughput_mbps']} Mbps
- Anomaly Score: {anomaly['anomaly_score']}
- Severity: {anomaly['severity']}
- Flags: {flags_str}
- Description: {anomaly['description']}

RUNBOOKS:
{context}

Respond ONLY with valid JSON matching this schema:
{{
  "root_cause": "<one sentence>",
  "failure_type": "<one of VALID_FAILURE_TYPES>",
  "confidence": <float 0.0-1.0>,
  "supporting_runbooks": ["<runbook title>", ...],
  "reasoning": "<2-3 sentences of chain-of-thought>"
}}"""

    chat = _client.chat.completions.create(
        model=_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    raw = json.loads(chat.choices[0].message.content)

    # Validate failure_type
    failure_type = raw.get("failure_type", "latency_spike")
    if failure_type not in VALID_FAILURE_TYPES:
        failure_type = "latency_spike"

    diagnosis = Diagnosis(
        root_cause=raw.get("root_cause", "Unknown root cause"),
        failure_type=failure_type,
        confidence=min(1.0, max(0.0, float(raw.get("confidence", 0.5)))),
        supporting_runbooks=raw.get("supporting_runbooks", []),
        reasoning=raw.get("reasoning", ""),
    )

    token_count = chat.usage.total_tokens if chat.usage else None
    latency_ms = int((time.monotonic() - t0) * 1000)

    await insert_agent_decision({
        "event_id": state["event_id"],
        "agent_name": "diagnosis",
        "input_state": {"query": query, "runbooks_retrieved": len(runbooks)},
        "output_state": dict(diagnosis),
        "latency_ms": latency_ms,
        "token_count": token_count,
    })

    return {**state, "diagnosis": diagnosis}
