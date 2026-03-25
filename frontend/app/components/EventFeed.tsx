"use client";

import { useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/api";
import type { LiveEvent, Severity } from "@/lib/types";

const SEV_BADGE: Record<Severity, string> = {
  LOW:      "sev-LOW",
  MEDIUM:   "sev-MEDIUM",
  HIGH:     "sev-HIGH",
  CRITICAL: "sev-CRITICAL",
};

const ACTION_COLOR: Record<string, string> = {
  reroute:  "text-blue-400",
  throttle: "text-purple-400",
  restart:  "text-amber-400",
};

interface Props {
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
  onEventsUpdate: (events: LiveEvent[]) => void;
}

export function EventFeed({ onSelectEvent, selectedEventId, onEventsUpdate }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const onEventsRef = useRef(onEventsUpdate);
  onEventsRef.current = onEventsUpdate;

  useEffect(() => {
    const es = createEventSource();
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const ev: LiveEvent = JSON.parse(e.data);
        setEvents((prev) => {
          const next = [ev, ...prev].slice(0, 300);
          onEventsRef.current(next);
          return next;
        });
      } catch {}
    };
    return () => es.close();
  }, []);

  const visible = filter === "ALL" ? events : events.filter((e) => e.severity === filter);

  return (
    <div className="flex flex-col h-full">
      {/* Table header bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            Live Event Log
          </span>
          <span className="text-[10px] font-mono text-slate-700">{events.length} events</span>
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {(["ALL","LOW","MEDIUM","HIGH","CRITICAL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                filter === s
                  ? "bg-slate-700 border-slate-500 text-slate-200"
                  : "border-[#1a2d4a] text-slate-600 hover:text-slate-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[80px_120px_72px_68px_64px_72px_100px_1fr_80px] gap-x-2 px-3 py-1.5 border-b border-[#1a2d4a] text-[9px] font-mono text-slate-600 uppercase tracking-widest">
        <span>Time</span>
        <span>Node</span>
        <span>Severity</span>
        <span>Latency</span>
        <span>Loss%</span>
        <span>Score</span>
        <span>Action</span>
        <span>Diagnosis</span>
        <span>Status</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            <span className="text-[11px] font-mono">
              {connected ? "No events match filter" : "Waiting for backend connection..."}
            </span>
          </div>
        )}
        {visible.map((ev, i) => (
          <EventRow
            key={`${ev.event_id}-${i}`}
            event={ev}
            selected={ev.event_id === selectedEventId}
            onClick={() => ev.event_id && onSelectEvent(ev.event_id)}
          />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event: ev, selected, onClick }: {
  event: LiveEvent;
  selected: boolean;
  onClick: () => void;
}) {
  const pct = Math.round(ev.anomaly_score * 100);
  const barColor =
    ev.severity === "CRITICAL" ? "#ef4444" :
    ev.severity === "HIGH" ? "#f97316" :
    ev.severity === "MEDIUM" ? "#eab308" : "#475569";

  return (
    <div
      onClick={onClick}
      className={`trow grid grid-cols-[80px_120px_72px_68px_64px_72px_100px_1fr_80px] gap-x-2 px-3 py-2 border-b border-[#111d30] cursor-pointer animate-slide-in ${
        selected ? "bg-amber-950/20 border-l-2 border-l-amber-500/60" : ""
      }`}
    >
      {/* Time */}
      <span className="font-mono text-[10px] text-slate-600">
        {new Date(ev.timestamp).toLocaleTimeString("en-US", { hour12: false })}
      </span>
      {/* Node */}
      <span className="font-mono text-[11px] text-slate-300 truncate">{ev.node_id}</span>
      {/* Severity badge */}
      <span className={`inline-flex items-center text-[9px] font-bold px-1.5 rounded w-fit h-fit ${SEV_BADGE[ev.severity]}`}>
        {ev.severity}
      </span>
      {/* Latency — not in SSE payload so show dash */}
      <span className="font-mono text-[10px] text-slate-500">—</span>
      {/* Loss */}
      <span className="font-mono text-[10px] text-slate-500">—</span>
      {/* Anomaly score bar */}
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1 bg-[#1a2d4a] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="font-mono text-[9px] text-slate-600 w-6 text-right">{pct}%</span>
      </div>
      {/* Action */}
      <span className={`font-mono text-[10px] capitalize ${ACTION_COLOR[ev.action_type] ?? "text-slate-600"}`}>
        {ev.action_type || "—"}
      </span>
      {/* Diagnosis */}
      <span className="text-[10px] text-slate-600 truncate">{ev.diagnosis_summary || "—"}</span>
      {/* Status */}
      {ev.requires_approval ? (
        <span className="font-mono text-[9px] text-amber-400 border border-amber-700/40 px-1 rounded w-fit">ACK REQ</span>
      ) : ev.action_type ? (
        <span className="font-mono text-[9px] text-emerald-400">AUTO</span>
      ) : (
        <span className="font-mono text-[9px] text-slate-700">—</span>
      )}
    </div>
  );
}
