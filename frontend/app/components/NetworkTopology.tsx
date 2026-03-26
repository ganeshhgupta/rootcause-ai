"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";

// 3-tier layout: core (top), edge (middle), dist (bottom)
const NODES: Record<string, { x: number; y: number; tier: "core" | "edge" | "dist"; label: string }> = {
  "node-core-01": { x: 90,  y: 55,  tier: "core", label: "CR-01" },
  "node-core-02": { x: 190, y: 38,  tier: "core", label: "CR-02" },
  "node-core-03": { x: 290, y: 55,  tier: "core", label: "CR-03" },
  "node-core-04": { x: 390, y: 38,  tier: "core", label: "CR-04" },
  "node-core-05": { x: 490, y: 55,  tier: "core", label: "CR-05" },
  "node-edge-01": { x: 40,  y: 148, tier: "edge", label: "ED-01" },
  "node-edge-02": { x: 105, y: 162, tier: "edge", label: "ED-02" },
  "node-edge-03": { x: 168, y: 145, tier: "edge", label: "ED-03" },
  "node-edge-04": { x: 232, y: 162, tier: "edge", label: "ED-04" },
  "node-edge-05": { x: 295, y: 145, tier: "edge", label: "ED-05" },
  "node-edge-06": { x: 360, y: 162, tier: "edge", label: "ED-06" },
  "node-edge-07": { x: 425, y: 145, tier: "edge", label: "ED-07" },
  "node-edge-08": { x: 490, y: 162, tier: "edge", label: "ED-08" },
  "node-edge-09": { x: 548, y: 145, tier: "edge", label: "ED-09" },
  "node-edge-10": { x: 605, y: 158, tier: "edge", label: "ED-10" },
  "node-dist-01": { x: 80,  y: 258, tier: "dist", label: "DS-01" },
  "node-dist-02": { x: 200, y: 268, tier: "dist", label: "DS-02" },
  "node-dist-03": { x: 320, y: 258, tier: "dist", label: "DS-03" },
  "node-dist-04": { x: 440, y: 268, tier: "dist", label: "DS-04" },
  "node-dist-05": { x: 555, y: 258, tier: "dist", label: "DS-05" },
};

const EDGES: [string, string][] = [
  ["node-core-01","node-core-02"],["node-core-02","node-core-03"],
  ["node-core-03","node-core-04"],["node-core-04","node-core-05"],
  ["node-core-01","node-edge-01"],["node-core-01","node-edge-02"],
  ["node-core-02","node-edge-02"],["node-core-02","node-edge-03"],["node-core-02","node-edge-04"],
  ["node-core-03","node-edge-04"],["node-core-03","node-edge-05"],["node-core-03","node-edge-06"],
  ["node-core-04","node-edge-06"],["node-core-04","node-edge-07"],["node-core-04","node-edge-08"],
  ["node-core-05","node-edge-08"],["node-core-05","node-edge-09"],["node-core-05","node-edge-10"],
  ["node-edge-01","node-dist-01"],["node-edge-02","node-dist-01"],["node-edge-02","node-dist-02"],
  ["node-edge-03","node-dist-02"],["node-edge-04","node-dist-02"],["node-edge-05","node-dist-03"],
  ["node-edge-06","node-dist-03"],["node-edge-06","node-dist-04"],["node-edge-07","node-dist-04"],
  ["node-edge-08","node-dist-04"],["node-edge-09","node-dist-05"],["node-edge-10","node-dist-05"],
];

const TIER_COLOR = { core: "#4f8ef7", edge: "#818cf8", dist: "#22d3ee" };

function nodeColor(sev: string): string {
  if (sev === "CRITICAL") return "#ef4444";
  if (sev === "HIGH")     return "#f97316";
  if (sev === "MEDIUM")   return "#f59e0b";
  return "#22c55e";
}

interface Props {
  events: LiveEvent[];
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

export function NetworkTopology({ events, onSelectNode, selectedNodeId }: Props) {
  const status = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of [...events].reverse()) {
      if (!map[ev.node_id]) map[ev.node_id] = ev.severity;
    }
    return map;
  }, [events]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Tier labels */}
      <div style={{ position: "absolute", left: 8, top: 40, fontSize: 9, fontFamily: "JetBrains Mono", color: TIER_COLOR.core, opacity: 0.7, letterSpacing: "0.1em" }}>CORE</div>
      <div style={{ position: "absolute", left: 8, top: 148, fontSize: 9, fontFamily: "JetBrains Mono", color: TIER_COLOR.edge, opacity: 0.7, letterSpacing: "0.1em" }}>EDGE</div>
      <div style={{ position: "absolute", left: 8, top: 248, fontSize: 9, fontFamily: "JetBrains Mono", color: TIER_COLOR.dist, opacity: 0.7, letterSpacing: "0.1em" }}>DIST</div>

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 4, right: 8, display: "flex", gap: 10, fontSize: 9, fontFamily: "JetBrains Mono" }}>
        {[["#22c55e","OK"],["#f59e0b","MED"],["#f97316","HIGH"],["#ef4444","CRIT"]].map(([c,l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 3, color: c as string }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c as string, display: "inline-block" }} />
            {l}
          </span>
        ))}
      </div>

      <svg viewBox="0 0 650 300" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <pattern id="g" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0L0 0 0 30" fill="none" stroke="#1f2d42" strokeWidth="0.5" opacity="0.5"/>
          </pattern>
        </defs>
        <rect width="650" height="300" fill="url(#g)" />

        {/* Tier separator lines */}
        <line x1="20" y1="102" x2="630" y2="102" stroke="#1f2d42" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="20" y1="205" x2="630" y2="205" stroke="#1f2d42" strokeWidth="1" strokeDasharray="4 4" />

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const na = NODES[a], nb = NODES[b];
          if (!na || !nb) return null;
          const ca = status[a] ?? "healthy", cb = status[b] ?? "healthy";
          const hot = ca === "CRITICAL" || cb === "CRITICAL";
          const warm = ca === "HIGH" || cb === "HIGH";
          return (
            <line key={`${a}${b}`}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={hot ? "#ef444440" : warm ? "#f9731628" : "#1f2d42"}
              strokeWidth={hot ? 1.5 : 0.8}
              strokeDasharray={hot ? "3 2" : undefined}
            />
          );
        })}

        {/* Nodes */}
        {Object.entries(NODES).map(([id, pos]) => {
          const sev = status[id] ?? "healthy";
          const color = nodeColor(sev);
          const isCrit = sev === "CRITICAL";
          const isSel = id === selectedNodeId;
          const r = isCrit ? 9 : 7;
          return (
            <g key={id} style={{ cursor: "pointer" }} onClick={() => onSelectNode?.(id)}>
              {/* Selection ring */}
              {isSel && <circle cx={pos.x} cy={pos.y} r={r + 5} fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />}
              {/* Pulse for critical */}
              {isCrit && (
                <circle cx={pos.x} cy={pos.y} r={r + 4} fill="none" stroke={color} strokeWidth="1" opacity="0.25"
                  style={{ animation: "node-crit 1.5s ease-in-out infinite" }} />
              )}
              {/* Tier ring */}
              <circle cx={pos.x} cy={pos.y} r={r + 3} fill="none" stroke={TIER_COLOR[pos.tier]} strokeWidth="1" opacity="0.2" />
              {/* Node fill */}
              <circle cx={pos.x} cy={pos.y} r={r} fill={`${color}20`} stroke={color} strokeWidth={isCrit ? 2 : 1.5} />
              {/* Center */}
              <circle cx={pos.x} cy={pos.y} r={isCrit ? 3.5 : 2.5} fill={color} />
              {/* Label */}
              <text x={pos.x} y={pos.y + r + 10} textAnchor="middle"
                fontSize="7.5" fill={isSel || isCrit ? color : "#3d5070"}
                fontFamily="JetBrains Mono, monospace" fontWeight={isSel ? "600" : "400"}>
                {pos.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
