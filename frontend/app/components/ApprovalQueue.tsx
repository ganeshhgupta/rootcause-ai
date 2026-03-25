"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { getPendingApprovals, approveplan, rejectPlan } from "@/lib/api";
import type { PendingApproval } from "@/lib/types";

export function ApprovalQueue() {
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const refresh = () => {
    setLoading(true);
    getPendingApprovals()
      .then((r) => setItems(r.pending))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (planId: string) => {
    setActing(planId);
    setItems((p) => p.filter((x) => x.plan_id !== planId));
    try {
      await approveplan(planId);
      showToast("Action approved and executed", true);
    } catch {
      showToast("Approval failed — check backend", false);
      refresh();
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (planId: string) => {
    setActing(planId);
    setItems((p) => p.filter((x) => x.plan_id !== planId));
    try {
      await rejectPlan(planId);
      showToast("Action rejected", false);
    } catch {
      refresh();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`absolute -top-8 left-0 right-0 text-xs px-3 py-1.5 rounded font-mono z-10 flex items-center gap-2
          ${toast.ok ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700" : "bg-red-900/80 text-red-300 border border-red-700"}`}>
          {toast.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">Approval Queue</span>
          {items.length > 0 && (
            <span className="text-[10px] bg-red-900/60 text-red-400 border border-red-700/40 px-1.5 py-0.5 rounded font-mono">
              {items.length}
            </span>
          )}
        </div>
        <button onClick={refresh} className="text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {items.length === 0 && (
          <div className="text-center py-6 text-slate-700 text-xs font-mono">
            No pending approvals
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.plan_id}
            className="rounded-lg border border-amber-700/30 bg-amber-950/10 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock size={11} className="text-amber-400" />
                <span className="text-xs font-mono font-semibold text-amber-300">{item.node_id}</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border
                ${item.severity === "CRITICAL"
                  ? "bg-red-900/40 text-red-400 border-red-700/40"
                  : "bg-orange-900/40 text-orange-400 border-orange-700/40"}`}>
                {item.severity}
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-500 mb-1 space-y-0.5">
              <div><span className="text-slate-600">ACTION </span><span className="text-slate-300 uppercase">{item.action_type}</span></div>
              <div><span className="text-slate-600">CONFIDENCE </span><span className="text-slate-300">{(item.confidence * 100).toFixed(0)}%</span></div>
              <div className="text-slate-700 truncate">{JSON.stringify(item.parameters)}</div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleApprove(item.plan_id)}
                disabled={acting === item.plan_id}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded
                  bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-700/40
                  transition-colors disabled:opacity-40"
              >
                <CheckCircle size={10} /> APPROVE
              </button>
              <button
                onClick={() => handleReject(item.plan_id)}
                disabled={acting === item.plan_id}
                className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-1.5 rounded
                  bg-red-900/30 hover:bg-red-800/50 text-red-400 border border-red-700/40
                  transition-colors disabled:opacity-40"
              >
                <XCircle size={10} /> REJECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
