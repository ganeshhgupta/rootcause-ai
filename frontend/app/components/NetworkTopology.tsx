"use client";

import { useMemo } from "react";
import type { LiveEvent, Severity } from "@/lib/types";

// Static layout positions for 20 nodes in 3 tiers
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

// Static edges
const EDGES: [string, string][] = [
  ["node-core-01","node-edge-01"],["node-core-01","node-edge-02"],
  ["node-core-02","node-edge-02"],["node-core-02","node-edge-03"],["node-core-02","node-edge-04"],
  ["node-core-03","node-edge-04"],["node-core-03","node-edge-05"],["node-core-03","node-edge-06"],
  ["node-core-04","node-edge-06"],["node-core-04","node-edge-07"],["node-core-04","node-edge-08"],
  ["node-core-05","node-edge-08"],["node-core-05","node-edge-09"],["node-core-05","node-edge-10"],
  // Core ring
  ["node-core-01","node-core-02"],["node-core-02","node-core-03"],
  ["node-core-03","node-core-04"],["node-core-04","node-core-05"],
  // Edge → dist
  ["node-edge-01","node-dist-01"],["node-edge-02","node-dist-01"],["node-edge-02","node-dist-02"],
  ["node-edge-03","node-dist-02"],["node-edge-04","node-dist-02"],["node-edge-05","node-dist-03"],
  ["node-edge-06","node-dist-03"],["node-edge-06","node-dist-04"],["node-edge-07","node-dist-04"],
  ["node-edge-08","node-dist-04"],["node-edge-09","node-dist-05"],["node-edge-10","node-dist-05"],
];

const SEV_COLOR: Record<Severity | "healthy", string> = {
  healthy:  "#10b981",
  LOW:      "#10b981",
  MEDIUM:   "#eab308",
  HIGH:     "#f97316",
  CRITICAL: "#ef4444",
};

const TIER_RING: Record<string, string> = {
  core: "#3b82f6",
  edge: "#8b5cf6",
  dist: "#06b6d4",
};

interface Props {
  events: LiveEvent[];
  onSelectNode?: (nodeId: string) => void;
}

export function NetworkTopology({ events, onSelectNode }: Props) {
  const nodeStatus = useMemo(() => {
    const map: Record<string, Severity> = {};
    // Use the most recent event per node
    for (const ev of [...events].reverse()) {
      if (!map[ev.node_id]) map[ev.node_id] = ev.severity;
    }
    return map;
  }, [events]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-3 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
        Network Topology · 20 nodes
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[9px] font-mono text-slate-600">
        {(["healthy","MEDIUM","HIGH","CRITICAL"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: SEV_COLOR[s] }} />
            {s}
          </span>
        ))}
      </div>

      <svg
        viewBox="0 0 750 320"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Subtle grid */}
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1a2d4a" strokeWidth="0.5" opacity="0.4"/>
          </pattern>
          <filter id="glow-green"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-red"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glow-orange"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        <rect width="750" height="320" fill="url(#grid)" rx="8" />

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const na = NODE_LAYOUT[a];
          const nb = NODE_LAYOUT[b];
          if (!na || !nb) return null;
          const sevA = nodeStatus[a];
          const sevB = nodeStatus[b];
          const hot = sevA === "CRITICAL" || sevB === "CRITICAL";
          const warm = sevA === "HIGH" || sevB === "HIGH";
          return (
            <line
              key={`${a}-${b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={hot ? "#ef444433" : warm ? "#f9731622" : "#1e3358"}
              strokeWidth={hot ? 1.5 : 1}
              strokeDasharray={hot ? "4 2" : undefined}
            />
          );
        })}

        {/* Tier labels */}
        <text x="10" y="66"  className="font-mono" fontSize="8" fill="#3b82f666">CORE</text>
        <text x="10" y="166" className="font-mono" fontSize="8" fill="#8b5cf666">EDGE</text>
        <text x="10" y="276" className="font-mono" fontSize="8" fill="#06b6d466">DIST</text>

        {/* Nodes */}
        {Object.entries(NODE_LAYOUT).map(([nodeId, pos]) => {
          const sev = nodeStatus[nodeId] || "healthy";
          const color = SEV_COLOR[sev as keyof typeof SEV_COLOR] || SEV_COLOR.healthy;
          const ring = TIER_RING[pos.tier];
          const isCritical = sev === "CRITICAL";
          const shortLabel = nodeId.replace("node-", "").replace("-0", "-").replace("-10", "-10");

          return (
            <g
              key={nodeId}
              className="cursor-pointer"
              onClick={() => onSelectNode?.(nodeId)}
            >
              {/* Outer ring (tier color) */}
              <circle cx={pos.x} cy={pos.y} r={isCritical ? 13 : 11}
                fill="none" stroke={ring} strokeWidth="1" opacity="0.35" />
              {/* Critical pulse ring */}
              {isCritical && (
                <circle cx={pos.x} cy={pos.y} r={16}
                  fill="none" stroke={color} strokeWidth="1" opacity="0.25"
                  style={{ animation: "node-pulse 1.5s infinite" }}
                />
              )}
              {/* Main node circle */}
              <circle
                cx={pos.x} cy={pos.y} r={isCritical ? 9 : 7}
                fill={`${color}22`}
                stroke={color}
                strokeWidth={isCritical ? 2 : 1.5}
                filter={isCritical ? "url(#glow-red)" : sev === "HIGH" ? "url(#glow-orange)" : sev === "LOW" || sev === "healthy" ? "url(#glow-green)" : undefined}
              />
              {/* Center dot */}
              <circle cx={pos.x} cy={pos.y} r={isCritical ? 3 : 2} fill={color} />
              {/* Label */}
              <text
                x={pos.x} y={pos.y + 22}
                textAnchor="middle"
                fontSize="7"
                fill="#64748b"
                fontFamily="JetBrains Mono, monospace"
              >
                {shortLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
