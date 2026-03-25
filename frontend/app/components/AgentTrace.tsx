"use client";

import { useEffect, useState } from "react";
import { Brain, Search, Wrench, Clock, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { getTrace } from "@/lib/api";
import type { EventTrace, AgentDecision } from "@/lib/types";

interface Props {
  eventId: string | null;
}

const AGENT_CONFIG = [
  { key: "monitor_decision" as const, label: "Monitor Agent", icon: <Search size={14} />, color: "text-blue-400", border: "border-blue-700/40" },
  { key: "diagnosis_decision" as const, label: "Diagnosis Agent", icon: <Brain size={14} />, color: "text-purple-400", border: "border-purple-700/40" },
  { key: "remediation_decision" as const, label: "Remediation Agent", icon: <Wrench size={14} />, color: "text-amber-400", border: "border-amber-700/40" },
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

  if (!eventId) return null;

  return (
    <div className="mt-4 rounded-lg border border-navy-700 bg-navy-900 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={13} className="text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">Agent Trace</span>
        {trace && (
          <span className="ml-auto font-mono text-[10px] text-slate-500">
            {trace.total_latency_ms}ms total
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
          <div className="w-3 h-3 border border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          Loading trace...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {trace && (
        <div className="space-y-3">
          {/* Event summary */}
          <div className="grid grid-cols-4 gap-2 text-[10px] font-mono bg-navy-800 rounded p-2 border border-navy-700">
            <div><span className="text-slate-600">NODE </span><span className="text-slate-200">{trace.event.node_id}</span></div>
            <div><span className="text-slate-600">LAT </span><span className="text-slate-200">{trace.event.latency_ms?.toFixed(0)}ms</span></div>
            <div><span className="text-slate-600">LOSS </span><span className="text-slate-200">{trace.event.packet_loss_pct?.toFixed(2)}%</span></div>
            <div><span className="text-slate-600">SCORE </span><span className="text-slate-200">{(trace.event.anomaly_score * 100).toFixed(0)}%</span></div>
          </div>

          {/* Agent pipeline */}
          <div className="relative">
            {AGENT_CONFIG.map((agent, i) => {
              const decision = trace[agent.key] as AgentDecision | null;
              return (
                <div key={agent.key}>
                  <AgentStep
                    label={agent.label}
                    icon={agent.icon}
                    color={agent.color}
                    border={agent.border}
                    decision={decision}
                  />
                  {i < AGENT_CONFIG.length - 1 && (
                    <div className="ml-5 w-px h-3 bg-navy-700" />
                  )}
                </div>
              );
            })}

            {/* HITL gate — shown if requires_approval */}
            {trace.remediation_decision && !trace.execution_result && (
              <>
                <div className="ml-5 w-px h-3 bg-amber-700/40" />
                <div className="rounded border border-amber-700/40 bg-amber-950/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={13} className="text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400">Human-in-the-Loop Gate</span>
                    <span className="ml-auto text-[10px] font-mono text-amber-600">PENDING</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Awaiting operator approval before execution.</p>
                </div>
              </>
            )}

            {/* Execution result */}
            {trace.execution_result && (
              <>
                <div className="ml-5 w-px h-3 bg-navy-700" />
                <div className="rounded border border-emerald-700/40 bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle size={13} className="text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">Execution Result</span>
                    <span className={`ml-auto text-[10px] font-mono ${trace.execution_result.success ? "text-emerald-400" : "text-red-400"}`}>
                      {trace.execution_result.success ? "SUCCESS" : "FAILED"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{String(trace.execution_result.message ?? "")}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentStep({
  label, icon, color, border, decision,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  decision: AgentDecision | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded border ${border} bg-navy-800/60 p-3`}>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className={color}>{icon}</span>
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        {decision ? (
          <>
            <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <Clock size={9} />
              {decision.latency_ms}ms
              {decision.token_count && (
                <span className="text-slate-600">{decision.token_count} tok</span>
              )}
            </span>
          </>
        ) : (
          <span className="ml-auto text-[10px] text-slate-700 font-mono">pending</span>
        )}
        <span className="text-slate-600 text-[10px]">{open ? "▲" : "▼"}</span>
      </div>

      {open && decision && (
        <div className="mt-2 space-y-1 text-[10px] font-mono">
          <div className="text-slate-600 uppercase tracking-widest mb-1">Output</div>
          <pre className="bg-navy-950 rounded p-2 text-slate-400 overflow-x-auto text-[9px] max-h-32">
            {JSON.stringify(decision.output_state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
