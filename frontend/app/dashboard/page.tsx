"use client";

import { useState, useMemo } from "react";
import { EventFeed } from "./components/EventFeed";
import { AgentTrace } from "./components/AgentTrace";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { NetworkTopology } from "./components/NetworkTopology";
import type { LiveEvent } from "@/lib/types";

// ── Tiny sparkline SVG ────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div style={{ width: 64, height: 24, opacity: 0.2, background: "var(--border)" }} />;
  const W = 64, H = 24;
  const max = Math.max(...values) || 1, min = Math.min(...values);
  const r = max - min || 1;
  const pts = values.slice(-16).map((v, i, a) => `${(i / (a.length - 1)) * W},${H - ((v - min) / r) * (H - 4) - 2}`).join(" ");
  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
}

// ── Gauge arc ─────────────────────────────────────────────────────────────────
function Arc({ pct, color }: { pct: number; color: string }) {
  const r = 18, circ = Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width={48} height={28} viewBox="0 0 48 28">
      <path d={`M4,26 A${r},${r} 0 0,1 44,26`} fill="none" stroke="var(--border2)" strokeWidth="3.5" strokeLinecap="round" />
      <path d={`M4,26 A${r},${r} 0 0,1 44,26`} fill="none" stroke={color} strokeWidth="3.5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

// ── KPI metrics bar (top row — like Image 6 device info row) ──────────────────
function MetricsBar({ events }: { events: LiveEvent[] }) {
  const stats = useMemo(() => {
    const recent = events.slice(0, 200);
    const total = events.length;
    const crit = recent.filter((e) => e.severity === "CRITICAL").length;
    const high = recent.filter((e) => e.severity === "HIGH").length;
    const auto = recent.filter((e) => !e.requires_approval && e.action_type).length;
    const pend = recent.filter((e) => e.requires_approval).length;
    const avgLat = recent.length
      ? recent.reduce((s, e) => s + (e.latency_ms || 0), 0) / recent.length
      : 0;
    const avgTput = recent.length
      ? recent.reduce((s, e) => s + (e.throughput_mbps || 0), 0) / recent.length
      : 0;
    const health = Math.max(94, 100 - crit * 0.5 - high * 0.15);
    const anomRate = recent.length ? ((crit + high) / recent.length) * 100 : 0;
    return { total, crit, high, auto, pend, avgLat, avgTput, health, anomRate };
  }, [events]);

  // Build sparklines from rolling event window
  const latHistory = useMemo(() => {
    const w: number[] = [];
    for (let i = 0; i < Math.min(events.length, 96); i += 6) {
      const slice = events.slice(i, i + 6);
      w.unshift(slice.reduce((s, e) => s + e.latency_ms, 0) / Math.max(slice.length, 1));
    }
    return w;
  }, [events]);
  const tputHistory = useMemo(() => {
    const w: number[] = [];
    for (let i = 0; i < Math.min(events.length, 96); i += 6) {
      const slice = events.slice(i, i + 6);
      w.unshift(slice.reduce((s, e) => s + e.throughput_mbps, 0) / Math.max(slice.length, 1));
    }
    return w;
  }, [events]);

  const chips = [
    {
      label: "Global Network Health", value: `${stats.health.toFixed(2)}%`,
      sub: stats.crit > 0 ? `${stats.crit} critical` : "All systems nominal",
      color: stats.crit > 0 ? "var(--red)" : "var(--green)",
      right: <Arc pct={stats.health} color={stats.crit > 0 ? "var(--red)" : "var(--green)"} />,
    },
    {
      label: "Avg Latency", value: `${stats.avgLat.toFixed(0)} ms`,
      sub: stats.avgLat > 100 ? "Elevated" : "Normal",
      color: stats.avgLat > 100 ? "var(--orange)" : "var(--accent)",
      right: <Sparkline values={latHistory} color={stats.avgLat > 100 ? "var(--orange)" : "var(--accent)"} />,
    },
    {
      label: "Avg Throughput", value: `${(stats.avgTput / 1000).toFixed(2)} Gbps`,
      sub: stats.avgTput < 400 ? "Degraded" : "Normal",
      color: stats.avgTput < 400 ? "var(--amber)" : "var(--green)",
      right: <Sparkline values={tputHistory} color={stats.avgTput < 400 ? "var(--amber)" : "var(--green)"} />,
    },
    {
      label: "Events Processed", value: stats.total.toLocaleString(),
      sub: `${stats.auto} auto-fixed`,
      color: "var(--indigo)",
      right: <Arc pct={stats.total > 0 ? Math.min(100, (stats.auto / Math.max(stats.total, 1)) * 100) : 0} color="var(--indigo)" />,
    },
    {
      label: "Active Remediation", value: String(stats.auto).padStart(2, "0"),
      sub: "auto-solving",
      color: "var(--amber)",
      right: <Arc pct={Math.min(100, stats.auto * 5)} color="var(--amber)" />,
    },
    {
      label: "Critical Alerts", value: String(stats.crit).padStart(2, "0"),
      sub: stats.crit > 0 ? "Requiring ACK" : "All clear",
      color: stats.crit > 0 ? "var(--red)" : "var(--green)",
      right: <Arc pct={Math.min(100, stats.crit * 10)} color={stats.crit > 0 ? "var(--red)" : "var(--green)"} />,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
      {chips.map((c) => (
        <div key={c.label} className="metric-chip">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div className="metric-label">{c.label}</div>
              <div className="metric-value" style={{ color: c.color, marginTop: 4 }}>{c.value}</div>
              <div className="metric-sub" style={{ marginTop: 2, color: c.color === "var(--green)" ? "var(--green)" : "var(--text2)" }}>
                {c.sub}
              </div>
            </div>
            <div style={{ marginTop: -2 }}>{c.right}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard root ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    const ev = events.find((e) => e.event_id === id);
    if (ev) setSelectedNode(ev.node_id);
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNode(nodeId);
    const ev = events.find((e) => e.node_id === nodeId);
    if (ev?.event_id) setSelectedEventId(ev.event_id);
  };

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)" }}>Network Intelligence Dashboard</h1>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
            Autonomous monitoring · diagnosis · remediation  ·  LangGraph + Groq pipeline
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 10, fontFamily: "JetBrains Mono", color: "var(--text3)", alignItems: "center" }}>
          <span style={{ color: "var(--green)" }}>● AGENT ACTIVE</span>
          <span>20 nodes monitored</span>
          <span>3-tier topology</span>
          <span style={{ color: "var(--accent)" }}>DEPLOY FIX →</span>
        </div>
      </div>

      {/* ── Row 1: KPI metrics bar (matches Image 6 top device row) ── */}
      <MetricsBar events={events} />

      {/* ── Row 2: Topology (left) + Log table (right) — Image 7 left + Image 6 main ── */}
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 12, minHeight: 340 }}>

        {/* Network topology (Image 7 left panel) */}
        <div className="panel" style={{ height: 340, position: "relative" }}>
          <div className="panel-header">
            <span className="panel-title">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><path d="M6 6l4 4M14 14l4 4M6 18l4-4M14 10l4-4"/></svg>
              Network Topology
            </span>
            <div style={{ display: "flex", gap: 6, fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--text3)" }}>
              <span>20 NODES</span>
              <span>·</span>
              <span>3 TIERS</span>
            </div>
          </div>
          <div style={{ padding: "8px 8px 4px", height: "calc(100% - 41px)" }}>
            <NetworkTopology events={events} onSelectNode={handleSelectNode} selectedNodeId={selectedNode} />
          </div>
        </div>

        {/* Event log table (Image 6 Log Viewer) */}
        <div className="panel" style={{ height: 340, display: "flex", flexDirection: "column" }}>
          <div className="panel-header" style={{ flexShrink: 0 }}>
            <span className="panel-title">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6M9 16h6M17 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></svg>
              Live Event Log
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <EventFeed
              onSelectEvent={handleSelectEvent}
              selectedEventId={selectedEventId}
              onEventsUpdate={setEvents}
            />
          </div>
        </div>
      </div>

      {/* ── Row 3: Agent trace (left) + Approval queue + metrics (right) — Image 6 bottom ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 12, minHeight: 280 }}>

        {/* Agent trace = Image 6 "Log Description" panel */}
        <div className="panel" style={{ height: 280, display: "flex", flexDirection: "column" }}>
          <div className="panel-header" style={{ flexShrink: 0 }}>
            <span className="panel-title">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              Agent Reasoning Trace
              {selectedEventId && <span style={{ fontSize: 9, color: "var(--text3)", fontWeight: 400, marginLeft: 4 }}>· {selectedEventId.slice(0, 8)}…</span>}
            </span>
            {selectedEventId && (
              <button onClick={() => setSelectedEventId(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "var(--text3)", fontFamily: "JetBrains Mono" }}>✕</button>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <AgentTrace eventId={selectedEventId} />
          </div>
        </div>

        {/* Right: Approval queue + perf summary = Image 6 "Search Viewer" panel */}
        <div className="panel" style={{ height: 280, display: "flex", flexDirection: "column" }}>
          <div className="panel-header" style={{ flexShrink: 0 }}>
            <span className="panel-title">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Governance Queue
            </span>
            <span style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--amber)" }}>HITL</span>
          </div>
          <div style={{ flex: 1, padding: "10px 12px", overflow: "hidden" }}>
            <ApprovalQueue />
          </div>
        </div>
      </div>
    </div>
  );
}
