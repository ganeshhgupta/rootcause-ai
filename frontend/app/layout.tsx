import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RootCause AI — Autonomous Telecom NetOps",
  description: "AI-powered NOC: real-time anomaly detection, autonomous diagnosis, human-in-the-loop remediation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070d1a]">
        <nav className="sticky top-0 z-50 border-b border-[#1a2d4a] bg-[#070d1a]/95 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-5 h-11 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L1 5v6l7 4 7-4V5L8 1z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M1 5l7 4m0 0l7-4M8 9v6" stroke="white" strokeWidth="1.5"/>
                </svg>
              </div>
              <span className="font-semibold text-[13px] text-white tracking-wide">ROOTCAUSE AI</span>
              <span className="hidden sm:block text-[10px] text-slate-600 font-mono tracking-widest">AUTONOMOUS OPS</span>
            </div>

            {/* Nav links */}
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              {["Dashboard", "Nodes", "Metrics", "Audit", "Settings"].map((l) => (
                <a key={l} href={l === "Dashboard" ? "/" : "#"}
                  className="px-3 py-1 rounded hover:bg-white/5 hover:text-slate-300 transition-colors">
                  {l}
                </a>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="text-slate-600">v2.4.1-SUMMIT6</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
