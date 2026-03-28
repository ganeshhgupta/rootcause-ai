import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* ── Top nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "rgba(11,17,32,0.95)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 20px", height: 46, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo + brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text1)", letterSpacing: "0.05em" }}>RootCause AI</div>
              <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "JetBrains Mono", letterSpacing: "0.1em" }}>AUTONOMOUS OPS</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {["Dashboard", "Nodes", "Metrics", "Governance", "Audit History"].map((l) => (
              <a key={l} href={l === "Dashboard" ? "/dashboard" : "#"} style={{
                padding: "4px 12px", borderRadius: 6, fontSize: 12, color: "var(--text2)",
                textDecoration: "none", transition: "all 0.15s",
                ...(l === "Dashboard" ? { color: "var(--accent)", background: "rgba(79,142,247,0.1)" } : {})
              }}>
                {l}
              </a>
            ))}
          </div>

          {/* Right status */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, fontFamily: "JetBrains Mono" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span className="dot-live" />
              <span style={{ color: "var(--green)" }}>LIVE</span>
            </div>
            <span style={{ color: "var(--text3)" }}>v2.4.1</span>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
