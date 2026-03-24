from typing import TypedDict, Optional, List


class NetworkEvent(TypedDict):
    node_id: str
    latency_ms: float
    packet_loss_pct: float
    throughput_mbps: float
    timestamp: str


class AnomalySummary(TypedDict):
    anomaly_score: float
    severity: str          # LOW | MEDIUM | HIGH | CRITICAL
    flags: List[str]
    description: str       # LLM-generated one-sentence natural language summary


class Diagnosis(TypedDict):
    root_cause: str
    failure_type: str      # one of 10 defined types
    confidence: float
    supporting_runbooks: List[str]
    reasoning: str


class RemediationPlan(TypedDict):
    action_type: str       # reroute | throttle | restart
    target_node: str
    parameters: dict
    confidence: float
    requires_approval: bool
    estimated_impact: str


class ExecutionResult(TypedDict):
    success: bool
    action_taken: str
    response_code: int
    message: str


class AgentState(TypedDict):
    event: NetworkEvent
    event_id: Optional[str]
    anomaly_summary: Optional[AnomalySummary]
    diagnosis: Optional[Diagnosis]
    remediation_plan: Optional[RemediationPlan]
    remediation_plan_id: Optional[str]
    human_approved: Optional[bool]
    execution_result: Optional[ExecutionResult]
    error: Optional[str]
    thread_id: Optional[str]
