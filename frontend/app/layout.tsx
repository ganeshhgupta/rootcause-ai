import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RootCause AI — Autonomous Telecom NetOps",
  description: "AI-powered NOC: real-time anomaly detection, autonomous diagnosis, human-in-the-loop remediation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
