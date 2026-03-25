"use client";

import { useState } from "react";
import { EventFeed } from "./components/EventFeed";
import { AgentTrace } from "./components/AgentTrace";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { MetricsPanel } from "./components/MetricsPanel";
import { NetworkTopology } from "./components/NetworkTopology";
import type { LiveEvent, Severity } from "@/lib/types";

const SEV_COLOR: Record<Severity, string> = {
  LOW: "#475569", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#ef4444",
};

// Global KPI bar derived from live events
function KpiBar({ events }: { events: LiveEvent[] }) {
  const recent = events.slice(0, 200);
  const critCount = recent.filter((e) => e.severity === "CRITICAL").length;
  const highCount = recent.filter((e) => e.severity === "HIGH").length;
  const autoCount = recent.filter((e) => !e.requires_approval && e.action_type).length;
  const pendingCount = recent.filter((e) => e.requires_approval).length;
  // Fake global health: degrades with anomaly count
  const health = Math.max(95, 100 - (critCount * 0.4 + highCount * 0.1)).toFixed(2);

  const kpis = [
    {
      label: "Global Network Health",
      value: `${health}%`,
      sub: "ALL SYSTEMS NOMINAL",
      color: "#10b981",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
    },
    {
      label: "Active Nodes",
      value: "20",
      sub: `+0 today`,
      color: "#3b82f6",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
        </svg>
      ),
    },
    {
      label: "Active Remediation",
      value: String(autoCount).padStart(2, "0"),
      sub: "AUTO-SOLVING",
      color: "#f59e0b",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      ),
    },
    {
      label: "Critical Alerts",
      value: String(critCount).padStart(2, "0"),
      sub: `${critCount > 0 ? "L5 SEVERITY · Requiring ACK" : "ALL CLEAR"}`,
      color: critCount > 0 ? "#ef4444" : "#10b981",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={critCount > 0 ? "#ef4444" : "#10b981"} strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {kpis.map((k) => (
        <div key={k.label} className="card px-4 py-3 flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${k.color}15`, border: `1px solid ${k.color}30` }}>
            {k.icon}
          </div>
          <div>
            <div className="font-mono text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wide">{k.label}</div>
            <div className="text-[8px] text-slate-700 font-mono">{k.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-4 space-y-4 min-h-[calc(100vh-44px)]">

      {/* ── Page title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-200 tracking-wide">Network Intelligence Dashboard</h1>
          <p className="text-[10px] text-slate-600 font-mono">
            Autonomous monitoring · diagnosis · remediation  ·  LangGraph pipeline
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AGENT ACTIVE
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-600">20 nodes monitored</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-600">{new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}</span>
        </div>
      </div>

      {/* ── KPI bar ── */}
      <KpiBar events={events} />

      {/* ── Middle section: Topology + Right column ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-3">

        {/* Topology */}
        <div className="card p-4 min-h-[340px] relative grid-bg overflow-hidden">
          <div className="absolute top-3 left-4 text-[9px] font-mono uppercase tracking-widest text-slate-600 z-10">
            ◈ Network Topology · 3-Tier Architecture
          </div>
          <div className="mt-5 h-[300px]">
            <NetworkTopology events={events} onSelectNode={(nodeId) => {
              // Find the most recent event for this node and select it
              const ev = events.find((e) => e.node_id === nodeId);
              if (ev?.event_id) setSelectedEventId(ev.event_id);
            }} />
          </div>
        </div>

        {/* Right column: Metrics + Approval */}
        <div className="flex flex-col gap-3">
          {/* Metrics + Agent loop */}
          <div className="card p-4">
            <MetricsPanel events={events} />
          </div>

          {/* Approval queue */}
          <div className="card p-4 flex-1 min-h-[200px]">
            <ApprovalQueue />
          </div>
        </div>
      </div>

      {/* ── Event log table ── */}
      <div className="card p-4" style={{ minHeight: "320px" }}>
        <EventFeed
          onSelectEvent={setSelectedEventId}
          selectedEventId={selectedEventId}
          onEventsUpdate={setEvents}
        />
      </div>

      {/* ── Agent trace (expands on row click) ── */}
      {selectedEventId && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-widest text-slate-600">
              <span className="text-amber-400">⬡</span>
              Agent Decision Trace
            </div>
            <button onClick={() => setSelectedEventId(null)}
              className="text-slate-700 hover:text-slate-400 text-[10px] font-mono">
              ✕ close
            </button>
          </div>
          <AgentTrace eventId={selectedEventId} />
        </div>
      )}
    </main>
  );
}
