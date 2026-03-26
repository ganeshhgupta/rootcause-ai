"use client";

import { useEffect, useState } from "react";
import { getTrace } from "@/lib/api";
import type { EventTrace, AgentDecision } from "@/lib/types";

interface Props { eventId: string | null; }

const STEPS = [
  { key: "monitor_decision" as const,     label: "Monitor Agent",     color: "#4f8ef7", icon: "◎", step: 1 },
  { key: "diagnosis_decision" as const,   label: "Diagnosis Agent",   color: "#818cf8", icon: "⬡", step: 2 },
  { key: "remediation_decision" as const, label: "Remediation Agent", color: "#f59e0b", icon: "⚡", step: 3 },
];

export function AgentTrace({ eventId }: Props) {
  const [trace, setTrace] = useState<EventTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!eventId) { setTrace(null); return; }
    setLoading(true);
    getTrace(eventId)
      .then(setTrace)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  if (!eventId) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", fontSize: 11 }}>
      ← Click a row to inspect the agent trace
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text3)", padding: 20, fontSize: 11, fontFamily: "JetBrains Mono" }}>
      <span style={{ width: 12, height: 12, border: "2px solid var(--border2)", borderTop: "2px solid var(--accent)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
      Loading trace for {eventId.slice(0, 8)}…
    </div>
  );

  if (!trace) return (
    <div style={{ color: "var(--text3)", padding: 20, fontSize: 11 }}>No trace found</div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "12px 14px" }}>
      {/* Event summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Node",       value: trace.event.node_id },
          { label: "Latency",    value: `${trace.event.latency_ms?.toFixed(0)} ms` },
          { label: "Loss",       value: `${trace.event.packet_loss_pct?.toFixed(2)}%` },
          { label: "Throughput", value: `${trace.event.throughput_mbps?.toFixed(0)} Mbps` },
          { label: "Score",      value: `${(trace.event.anomaly_score * 100).toFixed(0)}%` },
          { label: "Pipeline",   value: `${trace.total_latency_ms} ms total` },
        ].map((m) => (
          <div key={m.label} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ fontSize: 8, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 12, fontFamily: "JetBrains Mono", color: "var(--text1)", fontWeight: 600 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline steps */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        {STEPS.map((agent, i) => {
          const d = trace[agent.key] as AgentDecision | null;
          const isOpen = open === i;
          return (
            <div key={agent.key} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              {/* Step header */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: `${agent.color}08`, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOpen(isOpen ? null : i)}>
                <span style={{ color: agent.color, fontSize: 16 }}>{agent.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>STEP {agent.step}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: agent.color }}>{agent.label}</div>
                </div>
                {d && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--text2)" }}>{d.latency_ms}ms</div>
                    {d.token_count && <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>{d.token_count} tok</div>}
                  </div>
                )}
              </div>

              {/* Step body */}
              <div style={{ padding: "10px 12px" }}>
                {d ? (
                  <>
                    {Object.entries(d.output_state).slice(0, 5).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono", minWidth: 80, textTransform: "uppercase" }}>{k}</span>
                        <span style={{ fontSize: 10, color: "var(--text2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                    <button onClick={() => setOpen(isOpen ? null : i)} style={{ fontSize: 9, color: "var(--text3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4, fontFamily: "JetBrains Mono" }}>
                      {isOpen ? "▲ collapse" : "▼ expand"}
                    </button>
                    {isOpen && (
                      <pre style={{ marginTop: 8, fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--text2)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: 8, overflow: "auto", maxHeight: 120 }}>
                        {JSON.stringify(d.output_state, null, 2)}
                      </pre>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>Not executed</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Result panel */}
        <div style={{ width: 160, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: trace.execution_result ? "#22c55e08" : "#f59e0b08" }}>
            <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>STEP 4</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: trace.execution_result ? "var(--green)" : "var(--amber)" }}>
              {trace.execution_result ? "Executed" : "Pending"}
            </div>
          </div>
          <div style={{ padding: "10px 12px", fontSize: 10, color: "var(--text2)" }}>
            {trace.execution_result ? (
              <div style={{ fontFamily: "JetBrains Mono" }}>
                <div style={{ color: trace.execution_result.success ? "var(--green)" : "var(--red)", marginBottom: 4 }}>
                  {trace.execution_result.success ? "✓ SUCCESS" : "✕ FAILED"}
                </div>
                <div style={{ fontSize: 9, color: "var(--text3)", wordBreak: "break-all" }}>
                  {String(trace.execution_result.message ?? "").slice(0, 80)}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: "var(--amber)", fontFamily: "JetBrains Mono" }}>
                Awaiting operator approval
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
