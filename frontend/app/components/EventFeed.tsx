"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, RotateCcw, Zap } from "lucide-react";
import { createEventSource } from "@/lib/api";
import type { LiveEvent, Severity } from "@/lib/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: "bg-slate-700/60 text-slate-300 border-slate-600",
  MEDIUM: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  HIGH: "bg-orange-900/40 text-orange-400 border-orange-700/50",
  CRITICAL: "bg-red-900/40 text-red-400 border-red-700/50",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  reroute: <RefreshCw size={12} />,
  throttle: <Activity size={12} />,
  restart: <RotateCcw size={12} />,
};

interface Props {
  onSelectEvent: (eventId: string) => void;
  selectedEventId: string | null;
}

export function EventFeed({ onSelectEvent, selectedEventId }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = createEventSource();
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const event: LiveEvent = JSON.parse(e.data);
        setEvents((prev) => [event, ...prev].slice(0, 200));
      } catch {}
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Live Event Feed</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          <span className={connected ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
            {connected ? "STREAMING" : "DISCONNECTED"}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 font-mono">{events.length} events</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <Activity size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Waiting for network events...</p>
          </div>
        )}
        {events.map((ev) => (
          <EventCard
            key={`${ev.event_id}-${ev.timestamp}`}
            event={ev}
            selected={ev.event_id === selectedEventId}
            onClick={() => ev.event_id && onSelectEvent(ev.event_id)}
          />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event, selected, onClick }: { event: LiveEvent; selected: boolean; onClick: () => void }) {
  const sevStyle = SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.LOW;
  const pct = Math.round(event.anomaly_score * 100);

  const barColor =
    event.severity === "CRITICAL" ? "bg-red-500" :
    event.severity === "HIGH" ? "bg-orange-500" :
    event.severity === "MEDIUM" ? "bg-yellow-500" : "bg-slate-500";

  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border p-3 cursor-pointer transition-all duration-200 animate-slide-in
        ${selected
          ? "border-amber-500/60 bg-amber-950/20 glow-amber"
          : "border-navy-700 bg-navy-900 hover:border-navy-600 hover:bg-navy-800/80"
        }
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono uppercase ${sevStyle}`}>
            {event.severity}
          </span>
          <span className="text-sm font-mono font-medium text-slate-100 truncate">{event.node_id}</span>
        </div>
        {event.requires_approval && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] text-amber-400 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded font-mono">
            <Clock size={9} />
            AWAITING ACK
          </span>
        )}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 mb-2 text-[10px] font-mono text-slate-400">
        <div>
          <span className="text-slate-600">LAT </span>
          <span className="text-slate-200">{event.node_id ? "—" : ""}
          </span>
        </div>
        <div><span className="text-slate-600">ACTION </span><span className="text-slate-300 capitalize">{event.action_type || "—"}</span></div>
        <div className="flex items-center gap-1">
          {ACTION_ICONS[event.action_type] && (
            <span className="text-amber-400">{ACTION_ICONS[event.action_type]}</span>
          )}
          <span className="text-slate-400 truncate">{event.action_type || "pending"}</span>
        </div>
      </div>

      {/* Anomaly score bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-0.5">
          <span>ANOMALY SCORE</span>
          <span className="text-slate-300">{pct}%</span>
        </div>
        <div className="h-1 bg-navy-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Diagnosis */}
      {event.diagnosis_summary && (
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{event.diagnosis_summary}</p>
      )}

      <div className="mt-1.5 text-[9px] text-slate-700 font-mono">
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
