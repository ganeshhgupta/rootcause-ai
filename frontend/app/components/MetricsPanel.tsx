"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart2, Clock, Shield } from "lucide-react";
import type { LiveEvent } from "@/lib/types";

interface Props {
  events: LiveEvent[];
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <div className="h-8 opacity-20 bg-slate-800 rounded" />;
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = values.slice(-20).map((v, i, arr) => {
    const x = (i / (arr.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricsPanel({ events }: Props) {
  const [latencies, setLatencies] = useState<number[]>([]);
  const [anomalyRates, setAnomalyRates] = useState<number[]>([]);
  const [autoRatios, setAutoRatios] = useState<number[]>([]);

  useEffect(() => {
    if (events.length === 0) return;
    const recent = events.slice(0, 50);
    const highCount = recent.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length;
    const anomalyRate = (highCount / recent.length) * 100;
    const autoCount = recent.filter((e) => !e.requires_approval).length;
    const autoRatio = (autoCount / recent.length) * 100;

    setAnomalyRates((p) => [...p, anomalyRate].slice(-20));
    setAutoRatios((p) => [...p, autoRatio].slice(-20));
    setLatencies((p) => [...p, events.length * 1.2].slice(-20)); // placeholder trend
  }, [events.length]);

  const totalEvents = events.length;
  const recentSlice = events.slice(0, 50);
  const highCount = recentSlice.filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL").length;
  const anomalyRate = recentSlice.length > 0 ? ((highCount / recentSlice.length) * 100).toFixed(1) : "0.0";
  const autoCount = recentSlice.filter((e) => !e.requires_approval).length;
  const pendingCount = recentSlice.filter((e) => e.requires_approval).length;

  const stats = [
    {
      label: "Events Processed",
      value: totalEvents.toLocaleString(),
      sub: "total this session",
      icon: <Activity size={14} className="text-blue-400" />,
      color: "#60a5fa",
      sparkData: latencies,
    },
    {
      label: "Anomaly Rate",
      value: `${anomalyRate}%`,
      sub: "HIGH + CRITICAL",
      icon: <BarChart2 size={14} className="text-orange-400" />,
      color: "#fb923c",
      sparkData: anomalyRates,
    },
    {
      label: "Auto-Remediated",
      value: autoCount.toString(),
      sub: "no human needed",
      icon: <Shield size={14} className="text-emerald-400" />,
      color: "#34d399",
      sparkData: autoRatios,
    },
    {
      label: "Pending Approval",
      value: pendingCount.toString(),
      sub: "awaiting operator",
      icon: <Clock size={14} className="text-amber-400" />,
      color: "#fbbf24",
      sparkData: autoRatios.map((v) => 100 - v),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BarChart2 size={13} className="text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">Performance Telemetry</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-navy-700 bg-navy-900 p-3">
            <div className="flex items-center justify-between mb-1">
              {s.icon}
              <Sparkline values={s.sparkData} color={s.color} />
            </div>
            <div className="text-xl font-bold font-mono text-white">{s.value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</div>
            <div className="text-[9px] text-slate-700 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
