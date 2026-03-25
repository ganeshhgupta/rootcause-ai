"use client";

import { useEffect, useState } from "react";
import { getPendingApprovals, approveplan, rejectPlan } from "@/lib/api";
import type { PendingApproval } from "@/lib/types";

export function ApprovalQueue() {
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const refresh = () => {
    getPendingApprovals().then((r) => setItems(r.pending)).catch(() => {});
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
      showToast("Approved & executed", true);
    } catch {
      showToast("Approval failed", false);
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
      showToast("Rejected", false);
    } catch {
      refresh();
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Toast */}
      {toast && (
        <div className={`absolute -top-6 inset-x-0 text-[10px] font-mono px-2 py-1 rounded z-10 ${
          toast.ok ? "bg-emerald-900/70 text-emerald-300" : "bg-red-900/70 text-red-300"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-widest text-slate-600">Approval Queue</span>
        {items.length > 0 && (
          <span className="text-[9px] font-mono bg-red-900/40 text-red-400 border border-red-700/30 px-1.5 rounded">
            {items.length} PENDING
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {items.length === 0 && (
          <div className="text-center py-6 text-slate-700 text-[10px] font-mono">
            No pending approvals
          </div>
        )}
        {items.map((item) => (
          <div key={item.plan_id}
            className="rounded-lg border border-amber-700/25 bg-gradient-to-b from-amber-950/10 to-transparent p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-semibold text-amber-300">{item.node_id}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                item.severity === "CRITICAL"
                  ? "sev-CRITICAL"
                  : "sev-HIGH"
              }`}>{item.severity}</span>
            </div>

            {/* Plan details */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-mono mb-2">
              <span className="text-slate-600">ACTION</span>
              <span className="text-blue-400 uppercase">{item.action_type}</span>
              <span className="text-slate-600">CONFIDENCE</span>
              <span className="text-slate-400">{(item.confidence * 100).toFixed(0)}%</span>
              <span className="text-slate-600">ANOMALY</span>
              <span className="text-slate-400">{(item.anomaly_score * 100).toFixed(0)}%</span>
            </div>

            {/* Params */}
            <div className="bg-[#070d1a] rounded p-1.5 mb-2 text-[8px] font-mono text-slate-600 truncate">
              {JSON.stringify(item.parameters)}
            </div>

            {/* Buttons */}
            <div className="flex gap-1.5">
              <button onClick={() => handleApprove(item.plan_id)} disabled={acting === item.plan_id}
                className="flex-1 py-1.5 rounded text-[9px] font-semibold font-mono
                  bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400
                  border border-emerald-700/30 transition-colors disabled:opacity-40">
                ✓ APPROVE
              </button>
              <button onClick={() => handleReject(item.plan_id)} disabled={acting === item.plan_id}
                className="flex-1 py-1.5 rounded text-[9px] font-semibold font-mono
                  bg-red-900/20 hover:bg-red-900/40 text-red-400
                  border border-red-700/25 transition-colors disabled:opacity-40">
                ✕ REJECT
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
