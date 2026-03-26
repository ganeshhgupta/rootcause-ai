"use client";

import { useEffect, useState } from "react";
import { getPendingApprovals, approveplan, rejectPlan } from "@/lib/api";
import type { PendingApproval } from "@/lib/types";

export function ApprovalQueue() {
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => getPendingApprovals().then((r) => setItems(r.pending)).catch(() => {});
  useEffect(() => { refresh(); const t = setInterval(refresh, 5000); return () => clearInterval(t); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const approve = async (id: string) => {
    setActing(id); setItems((p) => p.filter((x) => x.plan_id !== id));
    try { await approveplan(id); showToast("✓ Approved & executed"); } catch { refresh(); } finally { setActing(null); }
  };
  const reject = async (id: string) => {
    setActing(id); setItems((p) => p.filter((x) => x.plan_id !== id));
    try { await rejectPlan(id); showToast("✕ Action rejected"); } catch { refresh(); } finally { setActing(null); }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {toast && (
        <div style={{ position: "absolute", top: -30, left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 4, padding: "4px 10px", fontSize: 10, color: "var(--text1)", fontFamily: "JetBrains Mono", zIndex: 10 }}>
          {toast}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", fontSize: 11, flexDirection: "column", gap: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            No pending approvals
          </div>
        ) : (
          items.map((item) => (
            <div key={item.plan_id} style={{ border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: 12, background: "rgba(245,158,11,0.04)" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text1)" }}>{item.node_id}</div>
                  <div style={{ fontSize: 9, fontFamily: "JetBrains Mono", color: "var(--text3)", marginTop: 1 }}>
                    {new Date(item.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <span className={`badge badge-${item.severity}`}>{item.severity}</span>
              </div>

              {/* Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: 8 }}>
                {[
                  ["Action", item.action_type.toUpperCase()],
                  ["Confidence", `${(item.confidence * 100).toFixed(0)}%`],
                  ["Anomaly", `${(item.anomaly_score * 100).toFixed(0)}%`],
                  ["Latency", `${item.latency_ms?.toFixed(0) ?? "—"} ms`],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono", textTransform: "uppercase" }}>{l}</span>
                    <span style={{ fontSize: 9, color: "var(--text2)", fontFamily: "JetBrains Mono", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Params */}
              <div style={{ background: "var(--bg)", borderRadius: 4, padding: "4px 8px", fontFamily: "JetBrains Mono", fontSize: 9, color: "var(--text3)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {JSON.stringify(item.parameters)}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-approve" style={{ flex: 1 }}
                  onClick={() => approve(item.plan_id)} disabled={acting === item.plan_id}>
                  ✓ APPROVE
                </button>
                <button className="btn btn-reject" style={{ flex: 1 }}
                  onClick={() => reject(item.plan_id)} disabled={acting === item.plan_id}>
                  ✕ REJECT
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
