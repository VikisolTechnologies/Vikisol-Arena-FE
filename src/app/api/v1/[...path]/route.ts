import { NextRequest, NextResponse } from "next/server";

/**
 * Local-only proxy so the browser can call the production API from localhost.
 * The live CORS list does not include this machine. Inert unless ARENA_DEV_PROXY=1,
 * which is never set on Vercel or Railway.
 */
async function proxy(req: NextRequest) {
  if (process.env.ARENA_DEV_PROXY !== "1") {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const target = new URL(req.nextUrl.pathname + req.nextUrl.search, "https://api-arena.vikisol.in");
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("content-length");
  headers.set("origin", "https://arena.vikisol.in");
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  const res = await fetch(target, { method: req.method, headers, body, redirect: "manual" });
  const out = new Headers(res.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  return new NextResponse(res.body, { status: res.status, headers: out });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
