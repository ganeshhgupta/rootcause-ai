import type { PendingApproval, EventTrace, ApprovalResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getPendingApprovals(): Promise<{
  pending: PendingApproval[];
  count: number;
}> {
  return apiFetch("/approvals/pending");
}

export async function approveplan(planId: string): Promise<ApprovalResponse> {
  return apiFetch(`/approvals/${planId}/approve`, { method: "POST" });
}

export async function rejectPlan(planId: string): Promise<ApprovalResponse> {
  return apiFetch(`/approvals/${planId}/reject`, { method: "POST" });
}

export async function getTrace(eventId: string): Promise<EventTrace> {
  return apiFetch(`/traces/${eventId}`);
}

export async function getHealth(): Promise<{
  status: string;
  db: string;
  corpus_ready: boolean;
  timestamp: string;
}> {
  return apiFetch("/health");
}

export function createEventSource(): EventSource {
  return new EventSource(`${BASE}/events/stream`);
}
