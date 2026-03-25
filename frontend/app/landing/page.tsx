import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="bg-[#060b18] text-slate-200 overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-900/20 border border-amber-700/30 rounded-full px-4 py-1.5 text-xs font-mono text-amber-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Autonomous Telecom NetOps · Powered by LangGraph + Groq
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            <span className="text-white">Your network fixes </span>
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              itself.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            RootCause AI monitors 20+ nodes in real time, diagnoses failures using
            RAG over network runbooks, and autonomously executes remediation —
            escalating to human operators only when it truly matters.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-900/30"
            >
              Open Live Dashboard →
            </Link>
            <a
              href="https://github.com/ganeshhgupta/rootcause-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-lg border border-navy-700 text-slate-300 font-semibold text-sm hover:border-slate-500 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Floating NOC screenshot mock */}
        <div className="relative z-10 mt-16 w-full max-w-5xl mx-auto">
          <div className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden shadow-2xl shadow-black/60">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-navy-800 bg-navy-950">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              <div className="ml-4 flex-1 bg-navy-800 rounded text-[10px] text-slate-600 font-mono px-3 py-1">
                rootcause-ai.vercel.app
              </div>
            </div>
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-3">Architecture</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Three agents. One pipeline.</h2>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            Every network event passes through a deterministic LangGraph state machine in under 3 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Monitor Agent",
              desc: "Computes z-scores against telecom baselines. Classifies severity. LLM generates a human-readable anomaly summary.",
              color: "from-blue-500 to-blue-700",
              icon: "◎",
            },
            {
              step: "02",
              title: "Diagnosis Agent",
              desc: "Embeds the anomaly query, retrieves top-5 runbooks from ChromaDB via semantic search, and uses Groq to identify root cause.",
              color: "from-purple-500 to-purple-700",
              icon: "⬡",
            },
            {
              step: "03",
              title: "Remediation Agent",
              desc: "Generates a structured action plan (reroute / throttle / restart). Routes CRITICAL actions to the human approval gate.",
              color: "from-amber-500 to-orange-600",
              icon: "⚡",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-navy-700 bg-navy-900 p-6 hover:border-navy-600 transition-colors">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-xl mb-4`}>
                {item.icon}
              </div>
              <div className="text-xs font-mono text-slate-600 mb-1">{item.step}</div>
              <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Pipeline arrow */}
        <div className="hidden md:flex items-center justify-center gap-2 mt-8 text-slate-700 font-mono text-xs">
          <span>Redis Stream</span>
          <span>→</span>
          <span>Monitor</span>
          <span>→</span>
          <span>Diagnosis</span>
          <span>→</span>
          <span>Remediation</span>
          <span>→</span>
          <span className="text-amber-500">HITL Gate</span>
          <span>→</span>
          <span>Executor</span>
          <span>→</span>
          <span>NeonDB</span>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-navy-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="text-3xl font-bold text-white">Production-grade from day one.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Real-time SSE Stream", desc: "Events flow from Redis Streams → LangGraph → SSE to your browser in <3s end-to-end.", icon: "⚡" },
              { title: "RAG over Runbooks", desc: "Wikipedia-sourced telecom docs chunked, embedded with sentence-transformers, and indexed in ChromaDB.", icon: "📚" },
              { title: "Human-in-the-Loop", desc: "LangGraph interrupt() genuinely suspends execution. Approval resumes the graph via REST API.", icon: "🔒" },
              { title: "NeonDB Audit Trail", desc: "Every agent decision, token count, latency, and execution result persisted to Postgres.", icon: "🗄️" },
              { title: "20-Node Topology", desc: "Core, edge, and distribution layer nodes emit realistic telemetry with 15% anomaly injection rate.", icon: "🌐" },
              { title: "LangSmith Tracing", desc: "Every LLM call, tool invocation, and graph transition automatically traced and observable.", icon: "🔭" },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-navy-800 bg-navy-900/60 p-5 hover:border-navy-700 transition-colors">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ───────────────────────────────────────────── */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-3">Stack</p>
          <h2 className="text-3xl font-bold text-white">Built on proven infrastructure.</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[
            "LangGraph 0.2", "Groq LLaMA 3.1", "ChromaDB", "sentence-transformers",
            "FastAPI", "NeonDB (Postgres)", "Upstash Redis", "Next.js 14",
            "LangSmith", "Docker", "Render", "Vercel",
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-full border border-navy-700 bg-navy-900 text-xs text-slate-400 font-mono hover:border-slate-600 transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See it handle a real outage.
          </h2>
          <p className="text-slate-500 mb-8">
            The live dashboard is connected to a 20-node synthetic network emitting events right now.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-amber-900/30"
          >
            Open Dashboard
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-navy-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700 font-mono">
          <span>ROOTCAUSE AI — autonomous telecom netops</span>
          <div className="flex gap-6">
            <a href="https://github.com/ganeshhgupta/rootcause-ai" className="hover:text-slate-500">GitHub</a>
            <a href="/">Dashboard</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="p-4 font-mono text-[10px] min-h-[320px] grid grid-cols-3 gap-3">
      {/* Event feed mock */}
      <div className="col-span-2 space-y-2">
        <div className="text-slate-600 uppercase tracking-widest text-[9px] mb-2">Live Event Feed</div>
        {[
          { node: "node-core-03", sev: "CRITICAL", score: 94, action: "reroute", wait: true },
          { node: "node-edge-07", sev: "HIGH", score: 72, action: "throttle", wait: false },
          { node: "node-dist-02", sev: "MEDIUM", score: 41, action: "reroute", wait: false },
          { node: "node-edge-01", sev: "LOW", score: 18, action: "—", wait: false },
        ].map((e) => (
          <div key={e.node} className="rounded border border-navy-700 bg-navy-800 p-2 flex items-center gap-3">
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border
              ${e.sev === "CRITICAL" ? "bg-red-900/50 text-red-400 border-red-700/40" :
                e.sev === "HIGH" ? "bg-orange-900/50 text-orange-400 border-orange-700/40" :
                e.sev === "MEDIUM" ? "bg-yellow-900/50 text-yellow-400 border-yellow-700/40" :
                "bg-slate-800 text-slate-400 border-slate-700"}`}>
              {e.sev}
            </span>
            <span className="text-slate-300">{e.node}</span>
            <div className="flex-1 h-1 bg-navy-700 rounded overflow-hidden">
              <div
                className={`h-full rounded ${e.sev === "CRITICAL" ? "bg-red-500" : e.sev === "HIGH" ? "bg-orange-500" : e.sev === "MEDIUM" ? "bg-yellow-500" : "bg-slate-600"}`}
                style={{ width: `${e.score}%` }}
              />
            </div>
            <span className="text-slate-500">{e.score}%</span>
            {e.wait && <span className="text-amber-400 text-[8px] border border-amber-700/40 px-1 rounded">ACK</span>}
          </div>
        ))}
      </div>

      {/* Right panel mock */}
      <div className="space-y-3">
        <div>
          <div className="text-slate-600 uppercase tracking-widest text-[9px] mb-2">Pending Approvals</div>
          <div className="rounded border border-amber-700/30 bg-amber-950/10 p-2">
            <div className="text-amber-400 text-[9px] font-bold mb-1">node-core-03 · CRITICAL</div>
            <div className="text-slate-600 text-[8px]">reroute → AS65001-AS65003</div>
            <div className="flex gap-1 mt-1.5">
              <div className="flex-1 text-center text-[7px] bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 rounded py-0.5">APPROVE</div>
              <div className="flex-1 text-center text-[7px] bg-red-900/30 text-red-400 border border-red-700/30 rounded py-0.5">REJECT</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-slate-600 uppercase tracking-widest text-[9px] mb-2">Telemetry</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Events", val: "1,284" },
              { label: "Anomaly", val: "14.2%" },
              { label: "Auto-fix", val: "89%" },
              { label: "Pending", val: "3" },
            ].map((m) => (
              <div key={m.label} className="rounded bg-navy-800 border border-navy-700 p-1.5">
                <div className="text-white font-bold text-xs">{m.val}</div>
                <div className="text-slate-600 text-[8px]">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
