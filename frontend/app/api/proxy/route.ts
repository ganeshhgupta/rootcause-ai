import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/proxy", "");
  const search = req.nextUrl.search;
  const url = `${BACKEND}${path}${search}`;
  const res = await fetch(url, { headers: Object.fromEntries(req.headers) });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const path = req.nextUrl.pathname.replace("/api/proxy", "");
  const url = `${BACKEND}${path}`;
  const body = await req.text();
  const res = await fetch(url, {
    method: "POST",
    headers: Object.fromEntries(req.headers),
    body,
  });
  const resBody = await res.text();
  return new NextResponse(resBody, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
