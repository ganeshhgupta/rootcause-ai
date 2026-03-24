import os
import time
import json
from groq import Groq
from agents.state import AgentState, RemediationPlan
from db.audit_log import insert_agent_decision, insert_remediation_plan

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
_model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

_HITL_THRESHOLD = float(os.environ.get("ANOMALY_HITL_THRESHOLD", "0.8"))

_ACTION_MAP = {
    "latency_spike": "reroute",
    "bgp_instability": "reroute",
    "congestion": "throttle",
    "ddos_attack": "throttle",
    "node_failure": "restart",
    "hardware_fault": "restart",
    "packet_loss": "reroute",
    "throughput_degradation": "throttle",
    "dns_failure": "reroute",
    "misconfiguration": "restart",
}

_PARAM_EXAMPLES = {
    "reroute": {"backup_route": "AS65001-AS65003", "metric_adjustment": 100},
    "throttle": {"rate_limit_mbps": 200, "duration_seconds": 300},
    "restart": {"graceful": True, "failover_first": True},
}


async def remediation_agent(state: AgentState) -> AgentState:
    t0 = time.monotonic()
    event = state["event"]
    anomaly = state["anomaly_summary"]
    diagnosis = state["diagnosis"]

    expected_action = _ACTION_MAP.get(diagnosis["failure_type"], "reroute")
    param_example = json.dumps(_PARAM_EXAMPLES[expected_action])

    prompt = f"""You are a telecom network remediation agent.

FAILURE CONTEXT:
- Node: {event['node_id']}
- Failure Type: {diagnosis['failure_type']}
- Root Cause: {diagnosis['root_cause']}
- Severity: {anomaly['severity']}
- Anomaly Score: {anomaly['anomaly_score']}
- Confidence: {diagnosis['confidence']}

REQUIRED action_type for failure_type '{diagnosis['failure_type']}': '{expected_action}'
Example parameters for '{expected_action}': {param_example}

Generate a specific remediation plan. The parameters must be realistic for the failure.
For reroute: include backup_route (BGP AS path) and metric_adjustment.
For throttle: include rate_limit_mbps (10-500) and duration_seconds (60-3600).
For restart: include graceful (bool) and failover_first (bool).

Respond ONLY with valid JSON:
{{
  "action_type": "{expected_action}",
  "target_node": "{event['node_id']}",
  "parameters": {{...}},
  "confidence": <float 0.0-1.0>,
  "estimated_impact": "<one sentence describing expected outcome>"
}}"""

    chat = _client.chat.completions.create(
        model=_model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.1,
    )

    raw = json.loads(chat.choices[0].message.content)

    # Enforce action_type mapping
    action_type = raw.get("action_type", expected_action)
    if action_type not in ("reroute", "throttle", "restart"):
        action_type = expected_action

    confidence = min(1.0, max(0.0, float(raw.get("confidence", diagnosis["confidence"]))))

    requires_approval = (
        anomaly["severity"] == "CRITICAL"
        or action_type == "restart"
        or confidence < 0.6
        or anomaly["anomaly_score"] >= _HITL_THRESHOLD
    )

    parameters = raw.get("parameters", _PARAM_EXAMPLES[action_type])
    if not isinstance(parameters, dict):
        parameters = _PARAM_EXAMPLES[action_type]

    plan = RemediationPlan(
        action_type=action_type,
        target_node=raw.get("target_node", event["node_id"]),
        parameters=parameters,
        confidence=confidence,
        requires_approval=requires_approval,
        estimated_impact=raw.get("estimated_impact", ""),
    )

    token_count = chat.usage.total_tokens if chat.usage else None
    latency_ms = int((time.monotonic() - t0) * 1000)

    await insert_agent_decision({
        "event_id": state["event_id"],
        "agent_name": "remediation",
        "input_state": {"failure_type": diagnosis["failure_type"], "severity": anomaly["severity"]},
        "output_state": dict(plan),
        "latency_ms": latency_ms,
        "token_count": token_count,
    })

    plan_id = await insert_remediation_plan({
        "event_id": state["event_id"],
        "thread_id": state.get("thread_id"),
        "action_type": plan["action_type"],
        "target_node": plan["target_node"],
        "parameters": plan["parameters"],
        "confidence": plan["confidence"],
        "requires_approval": plan["requires_approval"],
    })

    return {**state, "remediation_plan": plan, "remediation_plan_id": plan_id}
