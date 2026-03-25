"use client";

import { useState } from "react";
import { EventFeed } from "./components/EventFeed";
import { AgentTrace } from "./components/AgentTrace";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { MetricsPanel } from "./components/MetricsPanel";
import type { LiveEvent } from "@/lib/types";

export default function Dashboard() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 py-4 min-h-[calc(100vh-48px)]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold text-slate-200">Network Intelligence Dashboard</h1>
          <p className="text-[10px] text-slate-600 font-mono">Autonomous monitoring · diagnosis · remediation</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
          <span className="text-emerald-400">● AGENT ACTIVE</span>
          <span>|</span>
          <span>20 nodes monitored</span>
        </div>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Event Feed (full height) */}
        <div className="rounded-lg border border-navy-700 bg-navy-900 p-4 min-h-[600px] flex flex-col">
          <EventFeed
            onSelectEvent={setSelectedEventId}
            selectedEventId={selectedEventId}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Approval Queue */}
          <div className="rounded-lg border border-navy-700 bg-navy-900 p-4 relative">
            <ApprovalQueue />
          </div>

          {/* Metrics Panel */}
          <div className="rounded-lg border border-navy-700 bg-navy-900 p-4">
            <MetricsPanel events={events} />
          </div>
        </div>
      </div>

      {/* Agent Trace — expands below when event selected */}
      {selectedEventId && (
        <AgentTrace eventId={selectedEventId} />
      )}
    </main>
  );
}
