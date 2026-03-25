"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";

const NODE_LAYOUT: Record<string, { x: number; y: number; tier: "core" | "edge" | "dist" }> = {
  "node-core-01": { x: 120, y: 60,  tier: "core" },
  "node-core-02": { x: 220, y: 40,  tier: "core" },
  "node-core-03": { x: 320, y: 60,  tier: "core" },
  "node-core-04": { x: 420, y: 40,  tier: "core" },
  "node-core-05": { x: 520, y: 60,  tier: "core" },
  "node-edge-01": { x: 60,  y: 160, tier: "edge" },
  "node-edge-02": { x: 130, y: 170, tier: "edge" },
  "node-edge-03": { x: 200, y: 155, tier: "edge" },
  "node-edge-04": { x: 270, y: 170, tier: "edge" },
  "node-edge-05": { x: 340, y: 155, tier: "edge" },
  "node-edge-06": { x: 410, y: 170, tier: "edge" },
  "node-edge-07": { x: 480, y: 155, tier: "edge" },
  "node-edge-08": { x: 545, y: 170, tier: "edge" },
  "node-edge-09": { x: 610, y: 155, tier: "edge" },
  "node-edge-10": { x: 670, y: 165, tier: "edge" },
  "node-dist-01": { x: 100, y: 270, tier: "dist" },
  "node-dist-02": { x: 230, y: 280, tier: "dist" },
  "node-dist-03": { x: 350, y: 270, tier: "dist" },
  "node-dist-04": { x: 480, y: 280, tier: "dist" },
  "node-dist-05": { x: 600, y: 270, tier: "dist" },
};

const EDGES: [string, string][] = [
  ["node-core-01","node-edge-01"],["node-core-01","node-edge-02"],
  ["node-core-02","node-edge-02"],["node-core-02","node-edge-03"],["node-core-02","node-edge-04"],
  ["node-core-03","node-edge-04"],["node-core-03","node-edge-05"],["node-core-03","node-edge-06"],
  ["node-core-04","node-edge-06"],["node-core-04","node-edge-07"],["node-core-04","node-edge-08"],
  ["node-core-05","node-edge-08"],["node-core-05","node-edge-09"],["node-core-05","node-edge-10"],
  ["node-core-01","node-core-02"],["node-core-02","node-core-03"],
  ["node-core-03","node-core-04"],["node-core-04","node-core-05"],
  ["node-edge-01","node-dist-01"],["node-edge-02","node-dist-01"],["node-edge-02","node-dist-02"],
  ["node-edge-03","node-dist-02"],["node-edge-04","node-dist-02"],["node-edge-05","node-dist-03"],
  ["node-edge-06","node-dist-03"],["node-edge-06","node-dist-04"],["node-edge-07","node-dist-04"],
  ["node-edge-08","node-dist-04"],["node-edge-09","node-dist-05"],["node-edge-10","node-dist-05"],
];

function sevColor(sev: string): string {
  if (sev === "CRITICAL") return "#ef4444";
  if (sev === "HIGH")     return "#f97316";
  if (sev === "MEDIUM")   return "#eab308";
  return "#10b981"; // LOW or healthy
}

const TIER_RING: Record<string, string> = {
  core: "#3b82f6",
  edge: "#8b5cf6",
  dist: "#06b6d4",
};

const LEGEND = [
  { label: "healthy", color: "#10b981" },
  { label: "MEDIUM",  color: "#eab308" },
  { label: "HIGH",    color: "#f97316" },
  { label: "CRITICAL",color: "#ef4444" },
];

interface Props {
  events: LiveEvent[];
  onSelectNode?: (nodeId: string) => void;
}

export function NetworkTopology({ events, onSelectNode }: Props) {
  const nodeStatus = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of [...events].reverse()) {
      if (!map[ev.node_id]) map[ev.node_id] = ev.severity;
    }
    return map;
  }, [events]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-0 left-0 text-[9px] font-mono text-slate-600 uppercase tracking-widest z-10">
        Network Topology · 3-Tier · 20 Nodes
      </div>

      <div className="absolute bottom-0 left-0 flex items-center gap-3 text-[9px] font-mono text-slate-600 z-10">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <svg viewBox="0 0 750 320" className="w-full h-full" style={{ overflow: "visible" }}>
        <defs>
          <pattern id="topo-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1a2d4a" strokeWidth="0.5" opacity="0.4"/>
          </pattern>
        </defs>

        <rect width="750" height="320" fill="url(#topo-grid)" rx="8" />

        {/* Tier labels */}
        <text x="10" y="66"  fontSize="8" fill="#3b82f655" fontFamily="monospace">CORE</text>
        <text x="10" y="166" fontSize="8" fill="#8b5cf655" fontFamily="monospace">EDGE</text>
        <text x="10" y="276" fontSize="8" fill="#06b6d455" fontFamily="monospace">DIST</text>

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const na = NODE_LAYOUT[a];
          const nb = NODE_LAYOUT[b];
          if (!na || !nb) return null;
          const sevA = nodeStatus[a] ?? "healthy";
          const sevB = nodeStatus[b] ?? "healthy";
          const isCritPath = sevA === "CRITICAL" || sevB === "CRITICAL";
          const isHotPath  = sevA === "HIGH" || sevB === "HIGH";
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={isCritPath ? "#ef444433" : isHotPath ? "#f9731622" : "#1e3358"}
              strokeWidth={isCritPath ? 1.5 : 1}
              strokeDasharray={isCritPath ? "4 2" : undefined}
            />
          );
        })}

        {/* Nodes */}
        {Object.entries(NODE_LAYOUT).map(([nodeId, pos]) => {
          const sev = nodeStatus[nodeId] ?? "healthy";
          const color = sevColor(sev);
          const ring = TIER_RING[pos.tier];
          const isCrit = sev === "CRITICAL";
          const isHigh = sev === "HIGH";
          const rMain = isCrit ? 9 : 7;
          const shortLabel = nodeId.replace("node-", "").replace(/-0(\d)$/, "-$1");

          return (
            <g key={nodeId} className="cursor-pointer" onClick={() => onSelectNode?.(nodeId)}>
              {/* Tier ring */}
              <circle cx={pos.x} cy={pos.y} r={rMain + 4}
                fill="none" stroke={ring} strokeWidth="1" opacity="0.3" />
              {/* Pulse ring for critical */}
              {isCrit && (
                <circle cx={pos.x} cy={pos.y} r={rMain + 8}
                  fill="none" stroke={color} strokeWidth="1" opacity="0.2"
                  style={{ animation: "node-pulse 1.5s ease-in-out infinite" }}
                />
              )}
              {/* Fill */}
              <circle cx={pos.x} cy={pos.y} r={rMain}
                fill={`${color}1a`}
                stroke={color}
                strokeWidth={isCrit ? 2 : 1.5}
                opacity={isCrit || isHigh ? 1 : 0.8}
              />
              {/* Center dot */}
              <circle cx={pos.x} cy={pos.y} r={isCrit ? 3 : 2} fill={color} />
              {/* Label */}
              <text x={pos.x} y={pos.y + 21} textAnchor="middle"
                fontSize="7" fill="#475569" fontFamily="JetBrains Mono, monospace">
                {shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
