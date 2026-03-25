export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface LiveEvent {
  event_id: string;
  node_id: string;
  severity: Severity;
  anomaly_score: number;
  diagnosis_summary: string;
  action_type: string;
  requires_approval: boolean;
  thread_id: string;
  timestamp: string;
}

export interface PendingApproval {
  plan_id: string;
  event_id: string;
  thread_id: string | null;
  action_type: string;
  target_node: string;
  parameters: Record<string, unknown>;
  confidence: number;
  created_at: string;
  node_id: string;
  latency_ms: number;
  packet_loss_pct: number;
  throughput_mbps: number;
  anomaly_score: number;
  severity: Severity;
}

export interface AgentDecision {
  agent_name: string;
  input_state: Record<string, unknown>;
  output_state: Record<string, unknown>;
  latency_ms: number;
  token_count: number | null;
  created_at: string;
}

export interface EventTrace {
  event: {
    id: string;
    node_id: string;
    latency_ms: number;
    packet_loss_pct: number;
    throughput_mbps: number;
    anomaly_score: number;
    severity: Severity;
    created_at: string;
  };
  monitor_decision: AgentDecision | null;
  diagnosis_decision: AgentDecision | null;
  remediation_decision: AgentDecision | null;
  execution_result: Record<string, unknown> | null;
  total_latency_ms: number;
}

export interface ApprovalResponse {
  approved?: boolean;
  rejected?: boolean;
  plan_id: string;
  execution_result?: Record<string, unknown> | null;
}
