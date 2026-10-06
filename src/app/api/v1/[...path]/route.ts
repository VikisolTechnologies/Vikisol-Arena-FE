import { NextRequest, NextResponse } from "next/server";

/**
 * Local-only proxy so the browser can call the production API from localhost.
 * The live CORS list does not include this machine. Inert unless ARENA_DEV_PROXY=1,
 * which is never set on Vercel or Railway.
 *
 * GOLIVE-PROXY.md F-PROXY: the real production proxy is now the rewrite in
 * src/middleware.ts's proxyApiRequest() - it runs first and, whenever ARENA_API_ORIGIN and
 * ARENA_PROXY_SECRET are both set (Vercel production), handles every /api/v1/* request itself
 * by streaming it to arena-api, so this route handler is never reached there at all. This file
 * stays only as the pre-existing localhost convenience for hitting the live API without that
 * pair of env vars set. Streams the body (`duplex: "half"`) instead of buffering it with
 * `arrayBuffer()` as it used to - GOLIVE-PROXY.md flagged that as a defect worth fixing even
 * here, since a large local upload would otherwise sit fully in memory first.
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
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const res = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    duplex: hasBody ? "half" : undefined,
    redirect: "manual",
  } as RequestInit & { duplex?: "half" });
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
