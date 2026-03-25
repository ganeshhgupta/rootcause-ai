"use client";

import { useEffect, useState } from "react";
import { getTrace } from "@/lib/api";
import type { EventTrace, AgentDecision } from "@/lib/types";

interface Props { eventId: string | null; }

const AGENTS = [
  { key: "monitor_decision" as const,     label: "Monitor Agent",     color: "#3b82f6", sym: "◎" },
  { key: "diagnosis_decision" as const,   label: "Diagnosis Agent",   color: "#8b5cf6", sym: "⬡" },
  { key: "remediation_decision" as const, label: "Remediation Agent", color: "#f59e0b", sym: "⚡" },
];

export function AgentTrace({ eventId }: Props) {
  const [trace, setTrace] = useState<EventTrace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) { setTrace(null); return; }
    setLoading(true);
    setError(null);
    getTrace(eventId)
      .then(setTrace)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-slate-600 text-[11px] font-mono py-4">
      <span className="w-3 h-3 border border-slate-700 border-t-slate-400 rounded-full animate-spin" />
      Loading trace...
    </div>
  );
  if (error) return <div className="text-red-400 text-[11px] font-mono">Error: {error}</div>;
  if (!trace) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_200px] gap-3">
      {AGENTS.map((agent, i) => {
        const d = trace[agent.key] as AgentDecision | null;
        return (
          <AgentCard key={agent.key} agent={agent} decision={d} step={i + 1} />
        );
      })}

      {/* Execution / HITL result */}
      <div className="card-sm p-3">
        <div className="text-[9px] font-mono uppercase tracking-widest mb-2"
          style={{ color: trace.execution_result ? "#10b981" : "#f59e0b" }}>
          {trace.execution_result ? "✓ Executed" : "⏱ Awaiting"}
        </div>
        {trace.execution_result ? (
          <div className="space-y-1 text-[9px] font-mono">
            <div className="flex justify-between">
              <span className="text-slate-600">success</span>
              <span className={trace.execution_result.success ? "text-emerald-400" : "text-red-400"}>
                {String(trace.execution_result.success)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">code</span>
              <span className="text-slate-400">{String(trace.execution_result.response_code ?? "—")}</span>
            </div>
            <div className="text-slate-700 text-[8px] mt-1 truncate">
              {String(trace.execution_result.message ?? "")}
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-amber-600/60 font-mono">
            Human approval required before execution.
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-[#1a2d4a] text-[9px] font-mono text-slate-700">
          Total: {trace.total_latency_ms}ms
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent, decision, step }: {
  agent: { label: string; color: string; sym: string };
  decision: AgentDecision | null;
  step: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-sm p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: agent.color }} className="text-base">{agent.sym}</span>
        <div>
          <div className="text-[9px] text-slate-600 font-mono">STEP {step}</div>
          <div className="text-[11px] font-semibold" style={{ color: agent.color }}>{agent.label}</div>
        </div>
        {decision && (
          <div className="ml-auto text-right">
            <div className="text-[9px] font-mono text-slate-500">{decision.latency_ms}ms</div>
            {decision.token_count && (
              <div className="text-[8px] font-mono text-slate-700">{decision.token_count} tok</div>
            )}
          </div>
        )}
      </div>

      {decision ? (
        <>
          {/* Key output values */}
          <div className="space-y-0.5 text-[9px] font-mono mb-2">
            {Object.entries(decision.output_state).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-600 shrink-0">{k}</span>
                <span className="text-slate-400 truncate">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>

          {/* Expand toggle */}
          <button onClick={() => setOpen(!open)}
            className="text-[8px] font-mono text-slate-700 hover:text-slate-500">
            {open ? "▲ less" : "▼ full output"}
          </button>
          {open && (
            <pre className="mt-2 text-[8px] font-mono text-slate-600 bg-[#050a14] rounded p-2 overflow-auto max-h-28">
              {JSON.stringify(decision.output_state, null, 2)}
            </pre>
          )}
        </>
      ) : (
        <div className="text-[9px] text-slate-700 font-mono">No decision recorded</div>
      )}
    </div>
  );
}
