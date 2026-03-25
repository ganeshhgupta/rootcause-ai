"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";

interface Props { events: LiveEvent[]; }

function MiniSparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} className="rounded opacity-10 bg-slate-700" />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = (max - min) || 1;
  const W = 100;
  const H = height;
  const pts = values.slice(-24).map((v, i, a) => {
    const x = (i / (a.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x},${y}`;
  });
  const area = `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace("#","")})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GaugeMini({ pct, color }: { pct: number; color: string }) {
  const r = 22;
  const circ = Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct / 100));
  return (
    <svg width="56" height="32" viewBox="0 0 56 34">
      <path d={`M4,32 A${r},${r} 0 0,1 52,32`} fill="none" stroke="#1a2d4a" strokeWidth="4" strokeLinecap="round"/>
      <path d={`M4,32 A${r},${r} 0 0,1 52,32`} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}/>
      <text x="28" y="30" textAnchor="middle" fontSize="8" fill={color} fontFamily="JetBrains Mono,monospace">
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

export function MetricsPanel({ events }: Props) {
  const stats = useMemo(() => {
    const total = events.length;
    const recent = events.slice(0, 100);
    const highCount = recent.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length;
    const anomalyRate = recent.length > 0 ? (highCount / recent.length) * 100 : 0;
    const autoCount = recent.filter((e) => !e.requires_approval && e.action_type).length;
    const pendingCount = recent.filter((e) => e.requires_approval).length;
    const critCount = recent.filter((e) => e.severity === "CRITICAL").length;
    return { total, anomalyRate, autoCount, pendingCount, critCount };
  }, [events]);

  // Build sparkline history over last 20 events
  const anomalyHistory = useMemo(() => {
    const windows: number[] = [];
    for (let i = 0; i < Math.min(events.length, 120); i += 6) {
      const slice = events.slice(i, i + 6);
      const rate = slice.filter((e) => e.severity !== "LOW").length / Math.max(slice.length, 1) * 100;
      windows.unshift(rate);
    }
    return windows;
  }, [events]);

  const agentStates = [
    { label: "MONITOR",     color: "#3b82f6", active: events.length > 0 },
    { label: "DIAGNOSIS",   color: "#8b5cf6", active: events.length > 0 },
    { label: "REMEDIATION", color: "#f59e0b", active: events.filter(e => e.action_type).length > 0 },
  ];

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Events Processed", value: stats.total.toLocaleString(), color: "#3b82f6", icon: "▶" },
          { label: "Anomaly Rate",     value: `${stats.anomalyRate.toFixed(1)}%`, color: "#f97316", icon: "△" },
          { label: "Auto-Remediated",  value: stats.autoCount.toString(),         color: "#10b981", icon: "✓" },
          { label: "Pending Approval", value: stats.pendingCount.toString(),       color: "#f59e0b", icon: "⏱" },
        ].map((k) => (
          <div key={k.label} className="card-sm p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: k.color }}>{k.icon}</span>
              <GaugeMini pct={k.label === "Anomaly Rate" ? stats.anomalyRate : k.label === "Pending Approval" ? Math.min(100, stats.pendingCount * 10) : 100} color={k.color} />
            </div>
            <div className="font-mono text-xl font-bold text-white">{k.value}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wide">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Anomaly trend sparkline */}
      <div className="card-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Anomaly Trend</span>
          <span className="font-mono text-[10px]" style={{ color: "#f97316" }}>{stats.anomalyRate.toFixed(1)}%</span>
        </div>
        <MiniSparkline values={anomalyHistory.length > 0 ? anomalyHistory : [0]} color="#f97316" height={36} />
      </div>

      {/* Agent activity loop */}
      <div className="card-sm p-3">
        <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-3">Agent Activity Loop</div>
        <div className="space-y-2">
          {agentStates.map((a) => (
            <div key={a.label} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{
                background: a.active ? a.color : "#1a2d4a",
                boxShadow: a.active ? `0 0 6px ${a.color}` : "none",
                animation: a.active ? "pulse-sev 2s infinite" : undefined,
              }} />
              <span className="font-mono text-[10px]" style={{ color: a.active ? a.color : "#334155" }}>
                {a.label}
              </span>
              <div className="flex-1 h-px" style={{ background: a.active ? `${a.color}30` : "#1a2d4a" }} />
              <span className="text-[9px] font-mono" style={{ color: a.active ? "#10b981" : "#334155" }}>
                {a.active ? "ACTIVE" : "IDLE"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
