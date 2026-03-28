"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

// ─── Canvas particle network background ──────────────────────────────────────
function NetworkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let W = 0, H = 0;

    interface Node {
      x: number; y: number; vx: number; vy: number;
      r: number; pulse: number; dir: number; alert: boolean;
    }
    let nodes: Node[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      nodes = Array.from({ length: 55 }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        r: Math.random() * 1.8 + 1.2,
        pulse: Math.random(),
        dir: 1,
        alert: i < 6,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const a = (1 - d / 150) * 0.22;
            const hot = nodes[i].alert || nodes[j].alert;
            ctx.beginPath();
            ctx.strokeStyle = hot ? `rgba(239,68,68,${a * 0.9})` : `rgba(79,142,247,${a})`;
            ctx.lineWidth = hot ? 0.7 : 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        n.pulse += 0.025 * n.dir;
        if (n.pulse > 1 || n.pulse < 0) n.dir *= -1;

        if (n.alert) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4 + n.pulse * 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239,68,68,${0.12 + n.pulse * 0.12})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.alert
          ? `rgba(239,68,68,${0.4 + n.pulse * 0.35})`
          : `rgba(79,142,247,${0.35 + n.pulse * 0.3})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = n.alert ? "#ef4444" : "#4f8ef7";
        ctx.fill();

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -30) n.x = W + 30;
        if (n.x > W + 30) n.x = -30;
        if (n.y < -30) n.y = H + 30;
        if (n.y > H + 30) n.y = -30;
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    init();
    draw();

    const onResize = () => { resize(); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
  );
}

// ─── Scroll fade-in wrapper ───────────────────────────────────────────────────
function FadeIn({ children, delay = 0, up = true }: { children: ReactNode; delay?: number; up?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : `translateY(${up ? 28 : -10}px)`,
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ─── Animated number counter ─────────────────────────────────────────────────
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const dur = 1800;
      const tick = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 4);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ─── Landing page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ background: "#060c1a", color: "#e2eaf5", overflowX: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Minimal nav ── */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: "blur(20px)",
        background: scrolled ? "rgba(6,12,26,0.92)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(79,142,247,0.12)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 28px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(79,142,247,0.4)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.04em", background: "linear-gradient(90deg,#e2eaf5,#94b4e4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RootCause AI</div>
              <div style={{ fontSize: 8, color: "#3d5070", fontFamily: "JetBrains Mono", letterSpacing: "0.15em" }}>AUTONOMOUS NETOPS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="https://github.com/ganeshhgupta/rootcause-ai" target="_blank" rel="noopener noreferrer"
              style={{ padding: "7px 18px", borderRadius: 8, border: "1px solid rgba(79,142,247,0.2)", color: "#7b8fac", fontSize: 12, textDecoration: "none", fontFamily: "JetBrains Mono", transition: "all 0.2s" }}>
              GitHub
            </a>
            <Link href="/dashboard"
              style={{ padding: "8px 20px", borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "white", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 0 20px rgba(79,142,247,0.25)" }}>
              Live Dashboard →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 64, overflow: "hidden" }}>

        <NetworkCanvas />

        {/* Glow orbs */}
        <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,142,247,0.07) 0%, transparent 65%)", top: "40%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)", top: "15%", right: "8%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(129,140,248,0.05) 0%, transparent 70%)", bottom: "15%", left: "5%", pointerEvents: "none" }} />

        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(79,142,247,1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: 860, textAlign: "center", padding: "0 24px" }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.18)", borderRadius: 100, padding: "7px 20px", marginBottom: 36, animation: "fadeDown 0.7s ease both" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "heroBlink 2s infinite", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#64748b", letterSpacing: "0.12em" }}>NOW LIVE</span>
            <span style={{ width: 1, height: 14, background: "rgba(79,142,247,0.25)" }} />
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#4f8ef7", letterSpacing: "0.06em" }}>LangGraph + Groq + RAG</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(52px,9vw,100px)", fontWeight: 900, lineHeight: 1.0, marginBottom: 28, letterSpacing: "-0.04em", animation: "fadeUp 0.8s ease 0.1s both" }}>
            <span style={{ color: "#e2eaf5", display: "block" }}>Your network</span>
            <span style={{
              display: "block",
              background: "linear-gradient(95deg,#4f8ef7 0%,#818cf8 45%,#22d3ee 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 40px rgba(79,142,247,0.3))",
            }}>fixes itself.</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "#64748b", maxWidth: 600, margin: "0 auto 44px", lineHeight: 1.75, animation: "fadeUp 0.8s ease 0.2s both" }}>
            Monitors 20+ nodes in real-time, diagnoses failures using RAG over telecom runbooks,
            and autonomously remediates — escalating to humans only when confidence is low.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.8s ease 0.3s both" }}>
            <Link href="/dashboard" style={{
              padding: "15px 34px", borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: "none",
              background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "white",
              boxShadow: "0 0 50px rgba(79,142,247,0.35), 0 4px 20px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: 9,
              transition: "opacity 0.2s, transform 0.2s",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Open Live Dashboard
            </Link>
            <a href="https://github.com/ganeshhgupta/rootcause-ai" target="_blank" rel="noopener noreferrer" style={{
              padding: "15px 30px", borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8",
              display: "flex", alignItems: "center", gap: 9,
              backdropFilter: "blur(10px)", background: "rgba(255,255,255,0.03)",
              transition: "all 0.2s",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              View Source
            </a>
          </div>

          {/* Metric strip */}
          <div style={{ display: "flex", gap: 36, justifyContent: "center", marginTop: 64, flexWrap: "wrap", animation: "fadeUp 0.8s ease 0.45s both" }}>
            {[
              { val: "20", label: "nodes monitored", color: "#4f8ef7" },
              { val: "<3s", label: "mean time to remediate", color: "#22c55e" },
              { val: "89%", label: "auto-remediation rate", color: "#818cf8" },
              { val: "100%", label: "audit trail coverage", color: "#f59e0b" },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, fontWeight: 900, fontFamily: "JetBrains Mono", color: m.color, lineHeight: 1, textShadow: `0 0 20px ${m.color}60` }}>{m.val}</div>
                <div style={{ fontSize: 10, color: "#3d5070", marginTop: 5, letterSpacing: "0.04em" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll caret */}
        <div style={{ position: "absolute", bottom: 36, left: "50%", transform: "translateX(-50%)", animation: "scrollBounce 2.2s ease-in-out infinite" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3d5070" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>

      {/* ── Pipeline section ── */}
      <section style={{ padding: "110px 28px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#4f8ef7", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 14 }}>Architecture</div>
            <h2 style={{ fontSize: "clamp(30px,4.5vw,52px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#e2eaf5", margin: "0 0 14px" }}>Three agents. One outcome.</h2>
            <p style={{ color: "#3d5070", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>Every event passes through a deterministic LangGraph state machine in under 3 seconds.</p>
          </div>
        </FadeIn>

        {/* Pipeline flow */}
        <FadeIn delay={80}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto", padding: "8px 0 32px", gap: 0 }}>
            {([
              { label: "Redis Stream", sub: "event source", color: "#64748b", icon: "⌁" },
              "arrow",
              { label: "Monitor", sub: "anomaly detection", color: "#4f8ef7", icon: "◎" },
              "arrow",
              { label: "Diagnosis", sub: "RAG root cause", color: "#818cf8", icon: "⬡" },
              "arrow",
              { label: "Remediation", sub: "action planning", color: "#f59e0b", icon: "⚡" },
              "arrow",
              { label: "HITL Gate", sub: "human approval", color: "#ef4444", icon: "⊕" },
              "arrow",
              { label: "Executor", sub: "action dispatch", color: "#22c55e", icon: "✓" },
            ] as const).map((item, i) => {
              if (item === "arrow") {
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "0 2px", flexShrink: 0 }}>
                    <div style={{ width: 20, height: 1, background: "rgba(79,142,247,0.35)" }} />
                    <svg width="7" height="10" viewBox="0 0 7 10"><path d="M0 0l7 5-7 5V0z" fill="rgba(79,142,247,0.5)"/></svg>
                  </div>
                );
              }
              return (
                <div key={i} style={{ textAlign: "center", padding: "14px 16px", borderRadius: 12, flexShrink: 0, border: `1px solid ${item.color}22`, background: `${item.color}09`, minWidth: 90, transition: "all 0.25s" }} className="pipe-step">
                  <div style={{ fontSize: 22, marginBottom: 5, color: item.color }}>{item.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: item.color, fontFamily: "JetBrains Mono", lineHeight: 1.2 }}>{item.label}</div>
                  <div style={{ fontSize: 8, color: "#3d5070", marginTop: 3, fontFamily: "JetBrains Mono" }}>{item.sub}</div>
                </div>
              );
            })}
          </div>
        </FadeIn>

        {/* Agent cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 48 }}>
          {[
            {
              step: "01", icon: "◎", title: "Monitor Agent", color: "#4f8ef7",
              desc: "Computes z-scores against telecom baselines. Classifies anomaly severity LOW→CRITICAL. LLM generates a human-readable summary with flagged metrics.",
              chips: ["z-score analysis", "Groq LLaMA 3.1", "Severity classification"],
            },
            {
              step: "02", icon: "⬡", title: "Diagnosis Agent", color: "#818cf8",
              desc: "Embeds the anomaly query, retrieves the top-5 most relevant runbooks from ChromaDB via semantic similarity, and uses RAG to pinpoint root cause.",
              chips: ["ChromaDB vector search", "sentence-transformers", "Root cause analysis"],
            },
            {
              step: "03", icon: "⚡", title: "Remediation Agent", color: "#f59e0b",
              desc: "Generates a structured remediation plan (reroute / throttle / restart). CRITICAL confidence actions route to the HITL gate before execution.",
              chips: ["Action planning", "LangGraph interrupt()", "HITL gate"],
            },
          ].map((c, i) => (
            <FadeIn key={c.step} delay={i * 100}>
              <div style={{
                border: `1px solid ${c.color}1a`, borderRadius: 18, padding: "28px 26px",
                background: `linear-gradient(135deg, ${c.color}07 0%, rgba(6,12,26,0.6) 100%)`,
                backdropFilter: "blur(12px)", height: "100%",
                transition: "all 0.3s",
              }} className="agent-card">
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${c.color}15`, border: `1px solid ${c.color}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: c.color, flexShrink: 0 }}>
                    {c.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#3d5070", fontFamily: "JetBrains Mono", letterSpacing: "0.12em", marginBottom: 3 }}>STEP {c.step}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: c.color }}>{c.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.75, marginBottom: 20, margin: "0 0 20px" }}>{c.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {c.chips.map((ch) => (
                    <span key={ch} style={{ fontSize: 10, fontFamily: "JetBrains Mono", padding: "3px 11px", borderRadius: 100, border: `1px solid ${c.color}25`, color: c.color, background: `${c.color}0d` }}>{ch}</span>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "90px 28px", background: "rgba(79,142,247,0.025)", borderTop: "1px solid rgba(79,142,247,0.07)", borderBottom: "1px solid rgba(79,142,247,0.07)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 48 }}>
          {[
            { to: 20, suffix: "", prefix: "", label: "Nodes Monitored", sub: "3-tier topology", color: "#4f8ef7" },
            { to: 3,  suffix: "s", prefix: "<", label: "Mean Remediation Time", sub: "end-to-end pipeline", color: "#22c55e" },
            { to: 89, suffix: "%", prefix: "", label: "Auto-Remediation Rate", sub: "no human needed", color: "#818cf8" },
            { to: 100,suffix: "%", prefix: "", label: "Decision Audit Coverage", sub: "NeonDB persisted", color: "#f59e0b" },
          ].map((s) => (
            <FadeIn key={s.label} delay={60}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 60, fontWeight: 900, fontFamily: "JetBrains Mono", color: s.color, lineHeight: 1, letterSpacing: "-0.05em", textShadow: `0 0 30px ${s.color}50` }}>
                  <Counter to={s.to} suffix={s.suffix} prefix={s.prefix} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginTop: 10 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "#3d5070", marginTop: 4 }}>{s.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "110px 28px", maxWidth: 1200, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#4f8ef7", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 14 }}>Capabilities</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#e2eaf5", margin: 0 }}>Production-grade from day one.</h2>
          </div>
        </FadeIn>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
          {[
            { icon: "⚡", title: "Real-time SSE Stream", color: "#f59e0b", desc: "Events flow Redis Streams → LangGraph → SSE to your browser in <3s. Zero polling, zero WebSocket overhead." },
            { icon: "📚", title: "RAG over Runbooks", color: "#818cf8", desc: "Telecom runbooks chunked, embedded with sentence-transformers, and indexed in ChromaDB for semantic retrieval." },
            { icon: "🔒", title: "Human-in-the-Loop", color: "#ef4444", desc: "LangGraph interrupt() genuinely suspends graph execution. Operator approval via REST API resumes it exactly where it paused." },
            { icon: "🗄️", title: "Full Audit Trail", color: "#22c55e", desc: "Every agent decision, token count, pipeline latency, and execution result persisted to NeonDB." },
            { icon: "🌐", title: "20-Node Topology", color: "#4f8ef7", desc: "Core, edge, and distribution layer nodes emit realistic telemetry with a 15% anomaly injection rate." },
            { icon: "🔭", title: "LangSmith Tracing", color: "#22d3ee", desc: "Every LLM call, tool invocation, and graph state transition automatically traced and observable in LangSmith." },
          ].map((f, i) => (
            <FadeIn key={f.title} delay={i * 70}>
              <div style={{
                border: "1px solid rgba(79,142,247,0.07)", borderRadius: 16, padding: "26px 24px",
                background: "rgba(14,22,40,0.7)", backdropFilter: "blur(8px)",
                transition: "all 0.3s", height: "100%",
              }} className="feature-card">
                <div style={{ fontSize: 30, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e2eaf5", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Tech marquee ── */}
      <section style={{ padding: "64px 0", borderTop: "1px solid rgba(79,142,247,0.06)", borderBottom: "1px solid rgba(79,142,247,0.06)", overflow: "hidden" }}>
        <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#2d3f5a", textTransform: "uppercase", letterSpacing: "0.25em", textAlign: "center", marginBottom: 30 }}>
          Technology Stack
        </div>
        <div style={{ display: "flex", animation: "marquee 32s linear infinite" }}>
          {[0, 1].map((rep) => (
            <span key={rep} style={{ display: "flex", gap: 12, paddingRight: 12, flexShrink: 0 }}>
              {[
                "LangGraph 0.2", "Groq LLaMA 3.1", "ChromaDB", "sentence-transformers",
                "FastAPI", "NeonDB (Postgres)", "Upstash Redis", "Next.js 14",
                "LangSmith", "Docker", "Render", "Vercel", "Python 3.12", "TypeScript 5",
                "Tailwind CSS", "Server-Sent Events",
              ].map((t, j) => (
                <span key={j} style={{
                  padding: "7px 18px", borderRadius: 100, whiteSpace: "nowrap",
                  border: "1px solid rgba(79,142,247,0.13)", background: "rgba(79,142,247,0.04)",
                  color: "#4a607e", fontSize: 12, fontFamily: "JetBrains Mono", flexShrink: 0,
                }}>{t}</span>
              ))}
            </span>
          ))}
        </div>
      </section>

      {/* ── Terminal demo mock ── */}
      <section style={{ padding: "100px 28px", maxWidth: 1000, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#4f8ef7", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 14 }}>Live System</div>
            <h2 style={{ fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, letterSpacing: "-0.03em", color: "#e2eaf5", margin: 0 }}>Watch it work in real-time.</h2>
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          <div style={{ border: "1px solid rgba(79,142,247,0.15)", borderRadius: 16, overflow: "hidden", boxShadow: "0 0 80px rgba(79,142,247,0.08), 0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* Browser chrome */}
            <div style={{ background: "rgba(11,17,32,0.95)", padding: "12px 18px", borderBottom: "1px solid rgba(79,142,247,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(239,68,68,0.6)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(245,158,11,0.6)" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(34,197,94,0.6)" }} />
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "4px 14px", fontSize: 11, fontFamily: "JetBrains Mono", color: "#3d5070" }}>
                rootcause-ai.vercel.app/dashboard
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontFamily: "JetBrains Mono", color: "#22c55e" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "heroBlink 2s infinite" }} />
                LIVE
              </div>
            </div>
            {/* Mock dashboard content */}
            <div style={{ background: "#0b1120", padding: "20px", fontFamily: "JetBrains Mono" }}>
              {/* KPI row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Network Health", val: "99.82%", color: "#22c55e" },
                  { label: "Avg Latency", val: "47 ms", color: "#4f8ef7" },
                  { label: "Avg Throughput", val: "1.24 Gbps", color: "#22c55e" },
                  { label: "Critical Alerts", val: "02", color: "#ef4444" },
                ].map((k) => (
                  <div key={k.label} style={{ background: "#141e2e", border: "1px solid #1f2d42", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 8, color: "#3d5070", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{k.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {/* Event rows */}
              <div style={{ border: "1px solid #1f2d42", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid #1f2d42", display: "flex", gap: 16, fontSize: 9, color: "#3d5070", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  <span style={{ width: 20 }}>#</span><span style={{ width: 80 }}>Time</span><span style={{ width: 100 }}>Node</span><span style={{ width: 70 }}>Severity</span><span style={{ width: 70 }}>Latency</span><span style={{ flex: 1 }}>Failure Type</span><span>Status</span>
                </div>
                {[
                  { n: "node-core-03", sev: "CRITICAL", lat: "284ms", type: "bgp_route_flap", status: "ACK REQ", sc: "#ef4444" },
                  { n: "node-edge-07", sev: "HIGH", lat: "157ms", type: "interface_down", status: "AUTO", sc: "#f97316" },
                  { n: "node-dist-02", sev: "MEDIUM", lat: "89ms", type: "packet_loss_spike", status: "AUTO", sc: "#f59e0b" },
                  { n: "node-edge-01", sev: "LOW", lat: "41ms", type: "latency_jitter", status: "—", sc: "#64748b" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "8px 14px", borderBottom: "1px solid rgba(31,45,66,0.5)", fontSize: 11, color: "#7b8fac", alignItems: "center" }}>
                    <span style={{ width: 20, fontSize: 9, color: "#3d5070" }}>{String(i+1).padStart(2,"0")}</span>
                    <span style={{ width: 80, fontSize: 10 }}>09:4{i}:{(12+i*13)%60 < 10 ? "0" : ""}{(12+i*13)%60}</span>
                    <span style={{ width: 100, color: "#e2eaf5", fontWeight: 500 }}>{r.n}</span>
                    <span style={{ width: 70 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, border: "1px solid", color: r.sc, background: `${r.sc}12`, borderColor: `${r.sc}30` }}>{r.sev}</span>
                    </span>
                    <span style={{ width: 70, color: i === 0 ? "#f97316" : "#7b8fac" }}>{r.lat}</span>
                    <span style={{ flex: 1 }}>{r.type.replace(/_/g," ")}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: r.status === "ACK REQ" ? "#f59e0b" : r.status === "AUTO" ? "#22c55e" : "#3d5070" }}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "120px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,142,247,0.07) 0%, transparent 65%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <FadeIn>
          <div style={{ position: "relative", maxWidth: 580, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#4f8ef7", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 18 }}>Live right now</div>
            <h2 style={{ fontSize: "clamp(34px,5.5vw,60px)", fontWeight: 900, letterSpacing: "-0.04em", color: "#e2eaf5", marginBottom: 18, lineHeight: 1.05 }}>
              See it handle a<br/>
              <span style={{ background: "linear-gradient(95deg,#4f8ef7,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>real outage.</span>
            </h2>
            <p style={{ color: "#3d5070", fontSize: 15, marginBottom: 40, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 40px" }}>
              The live dashboard is connected to a 20-node synthetic network emitting anomalies right now.
            </p>
            <Link href="/dashboard" style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              padding: "17px 44px", borderRadius: 14, fontWeight: 700, fontSize: 15, textDecoration: "none",
              background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "white",
              animation: "glowPulse 3s ease-in-out infinite",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              Open Live Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "36px 28px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#4f8ef7,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono", color: "#2d3f5a", letterSpacing: "0.08em" }}>ROOTCAUSE AI — AUTONOMOUS TELECOM NETOPS</span>
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 12, fontFamily: "JetBrains Mono", color: "#2d3f5a" }}>
            <a href="https://github.com/ganeshhgupta/rootcause-ai" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>GitHub</a>
            <Link href="/dashboard" style={{ color: "inherit", textDecoration: "none" }}>Dashboard</Link>
            <span>© 2025</span>
          </div>
        </div>
      </footer>

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes fadeDown   { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(20px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes heroBlink  { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes scrollBounce { 0%,100% { transform:translateX(-50%) translateY(0); } 55% { transform:translateX(-50%) translateY(-8px); } }
        @keyframes marquee    { from { transform:translateX(0); } to { transform:translateX(-50%); } }
        @keyframes glowPulse  { 0%,100% { box-shadow:0 0 40px rgba(79,142,247,0.4),0 4px 20px rgba(0,0,0,0.35); } 50% { box-shadow:0 0 70px rgba(79,142,247,0.65),0 4px 20px rgba(0,0,0,0.35); } }
        .agent-card:hover   { border-color: rgba(79,142,247,0.28) !important; box-shadow: 0 12px 48px rgba(79,142,247,0.09); transform: translateY(-3px); }
        .feature-card:hover { border-color: rgba(79,142,247,0.14) !important; box-shadow: 0 8px 32px rgba(0,0,0,0.25); transform: translateY(-2px); }
        .pipe-step:hover    { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
