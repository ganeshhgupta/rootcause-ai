import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RootCause AI — Autonomous Telecom NetOps",
  description: "AI-powered network operations center: real-time anomaly detection, autonomous diagnosis, and human-in-the-loop remediation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#060b18] text-slate-200 antialiased">
        <nav className="sticky top-0 z-50 border-b border-navy-800 bg-[#0a1628]/95 backdrop-blur-sm">
          <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-wide text-white">ROOTCAUSE AI</span>
              <span className="text-xs text-slate-500 font-mono">autonomous ops</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <a href="/" className="hover:text-white transition-colors">Dashboard</a>
              <a href="/landing" className="hover:text-white transition-colors">About</a>
              <ConnectionStatus />
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

function ConnectionStatus() {
  return (
    <div className="flex items-center gap-1.5" id="conn-status">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
      <span className="text-emerald-400 font-mono">LIVE</span>
    </div>
  );
}
