"use client";

import { useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/api";
import type { LiveEvent, Severity } from "@/lib/types";

const SEV_COLORS: Record<Severity, string> = {
  LOW: "#64748b", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444",
};

interface Props {
  onSelectEvent: (id: string) => void;
  selectedEventId: string | null;
  onEventsUpdate: (events: LiveEvent[]) => void;
}

type ConnState = "connecting" | "warming" | "streaming" | "offline";

export function EventFeed({ onSelectEvent, selectedEventId, onEventsUpdate }: Props) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connState, setConnState] = useState<ConnState>("connecting");
  const [retryIn, setRetryIn] = useState(0);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const cbRef = useRef(onEventsUpdate);
  cbRef.current = onEventsUpdate;
  const esRef = useRef<EventSource | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(3000);
  const destroyed = useRef(false);

  const connect = () => {
    if (destroyed.current) return;
    setConnState("connecting");
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/events/stream`);
    esRef.current = es;

    const warmupTimeout = setTimeout(() => {
      if (es.readyState !== EventSource.OPEN) setConnState("warming");
    }, 4000);

    es.onopen = () => {
      clearTimeout(warmupTimeout);
      retryDelay.current = 3000;
      setConnState("streaming");
      setRetryIn(0);
    };

    es.onerror = () => {
      clearTimeout(warmupTimeout);
      es.close();
      if (destroyed.current) return;
      setConnState("offline");
      // Exponential backoff: 3s → 6s → 12s → 30s cap
      const delay = Math.min(retryDelay.current, 30000);
      retryDelay.current = Math.min(delay * 2, 30000);
      setRetryIn(Math.round(delay / 1000));

      let remaining = Math.round(delay / 1000);
      const tick = setInterval(() => {
        remaining -= 1;
        setRetryIn(remaining);
        if (remaining <= 0) clearInterval(tick);
      }, 1000);

      retryTimer.current = setTimeout(() => {
        clearInterval(tick);
        connect();
      }, delay);
    };

    es.onmessage = (e) => {
      if (e.data === "" || e.data === "keepalive") return;
      try {
        const ev: LiveEvent = JSON.parse(e.data);
        setConnState("streaming");
        setEvents((prev) => {
          const next = [ev, ...prev].slice(0, 500);
          cbRef.current(next);
          return next;
        });
      } catch {}
    };
  };

  useEffect(() => {
    destroyed.current = false;
    connect();
    return () => {
      destroyed.current = true;
      esRef.current?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connected = connState === "streaming";

  const visible = events
    .filter((e) => filter === "ALL" || e.severity === filter)
    .filter((e) => !search || e.node_id.includes(search) || e.failure_type?.includes(search) || e.action_type?.includes(search));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Toolbar (matches Image 6 Log Viewer header) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: 6, padding: "4px 10px", flex: 1, minWidth: 120 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by node, type, action..."
            style={{ background: "none", border: "none", outline: "none", fontSize: 11, color: "var(--text2)", width: "100%" }}
          />
        </div>

        {/* Severity filter pills */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["ALL","LOW","MEDIUM","HIGH","CRITICAL"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              fontSize: 9, fontFamily: "JetBrains Mono", fontWeight: 600, padding: "3px 8px",
              borderRadius: 4, border: "1px solid", cursor: "pointer",
              color: filter === s ? (s === "ALL" ? "#e2eaf5" : SEV_COLORS[s as Severity]) : "var(--text3)",
              background: filter === s ? (s === "ALL" ? "rgba(79,142,247,0.1)" : `${SEV_COLORS[s as Severity]}15`) : "transparent",
              borderColor: filter === s ? (s === "ALL" ? "rgba(79,142,247,0.3)" : `${SEV_COLORS[s as Severity]}40`) : "var(--border)",
            }}>
              {s}
            </button>
          ))}
        </div>

        {/* Connection status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 4 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", display: "inline-block",
            background: connState === "streaming" ? "var(--green)" : connState === "warming" || connState === "connecting" ? "var(--amber)" : "var(--red)",
            animation: connState === "streaming" ? "blink 2s infinite" : connState !== "offline" ? "blink 0.6s infinite" : "none",
          }} />
          <span style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: connState === "streaming" ? "var(--green)" : connState === "warming" || connState === "connecting" ? "var(--amber)" : "var(--red)" }}>
            {connState === "streaming" ? "STREAMING" : connState === "warming" ? "WARMING UP…" : connState === "connecting" ? "CONNECTING…" : retryIn > 0 ? `RETRY IN ${retryIn}s` : "RECONNECTING…"}
          </span>
          <span style={{ fontSize: 9, color: "var(--text3)", marginLeft: 6 }}>{events.length} events</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 24 }}>#</th>
              <th>Timestamp</th>
              <th>Node</th>
              <th>Severity</th>
              <th>Latency</th>
              <th>Loss %</th>
              <th>Throughput</th>
              <th>Score</th>
              <th>Failure Type</th>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
                  {connState === "streaming" ? "No events match the current filter"
                    : connState === "warming" ? "Backend warming up — Render free tier cold start (~30s)…"
                    : connState === "connecting" ? "Connecting to backend…"
                    : retryIn > 0 ? `Backend offline — retrying in ${retryIn}s…`
                    : "Reconnecting…"}
                </td>
              </tr>
            )}
            {visible.slice(0, 200).map((ev, i) => {
              const color = SEV_COLORS[ev.severity];
              const pct = Math.round(ev.anomaly_score * 100);
              const isSelected = ev.event_id === selectedEventId;
              return (
                <tr key={`${ev.event_id}-${i}`} className={isSelected ? "selected" : ""} onClick={() => ev.event_id && onSelectEvent(ev.event_id)}>
                  <td className="mono" style={{ color: "var(--text3)", fontSize: 9 }}>{String(i + 1).padStart(2, "0")}</td>
                  <td className="mono" style={{ fontSize: 10 }}>{new Date(ev.timestamp).toLocaleTimeString("en-US", { hour12: false })}</td>
                  <td><span style={{ color: "var(--text1)", fontWeight: 500 }}>{ev.node_id}</span></td>
                  <td><span className={`badge badge-${ev.severity}`}>{ev.severity}</span></td>
                  <td className="mono" style={{ color: ev.latency_ms > 100 ? "var(--orange)" : "var(--text2)" }}>
                    {ev.latency_ms?.toFixed(0) ?? "—"} ms
                  </td>
                  <td className="mono" style={{ color: ev.packet_loss_pct > 1 ? "var(--red)" : "var(--text2)" }}>
                    {ev.packet_loss_pct?.toFixed(2) ?? "—"}%
                  </td>
                  <td className="mono" style={{ color: ev.throughput_mbps < 400 ? "var(--amber)" : "var(--text2)" }}>
                    {ev.throughput_mbps?.toFixed(0) ?? "—"} Mbps
                  </td>
                  <td style={{ minWidth: 80 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div className="score-bar" style={{ width: 44 }}>
                        <div className="score-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="mono" style={{ fontSize: 9, color: "var(--text3)" }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text2)" }}>{ev.failure_type?.replace(/_/g, " ") || "—"}</td>
                  <td>
                    <span style={{ fontSize: 10, color: ev.action_type === "reroute" ? "#4f8ef7" : ev.action_type === "throttle" ? "#818cf8" : ev.action_type === "restart" ? "#f59e0b" : "var(--text3)" }}>
                      {ev.action_type || "—"}
                    </span>
                  </td>
                  <td>
                    {ev.requires_approval
                      ? <span style={{ fontSize: 9, color: "#f59e0b", fontFamily: "JetBrains Mono", border: "1px solid #f59e0b40", padding: "1px 5px", borderRadius: 3 }}>ACK REQ</span>
                      : ev.action_type
                        ? <span style={{ fontSize: 9, color: "var(--green)", fontFamily: "JetBrains Mono" }}>AUTO</span>
                        : <span style={{ fontSize: 9, color: "var(--text3)" }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
