/**
 * GOLIVE-PROXY.md F-PROXY — server-only (never `NEXT_PUBLIC_*`) origin of the real backend,
 * for the handful of server components/route handlers that must call arena-api directly
 * instead of through the browser's same-origin `/api/v1/*` (which `middleware.ts` rewrites).
 * `NEXT_PUBLIC_API_BASE_URL` becomes a relative path (`/api/v1`) in production, so it has no
 * origin of its own to fetch from a Node/Edge server context — this is the one that does.
 *
 * Never logged, never sent to the browser, never used to build a client-visible link (that
 * would leak the tunnel hostname — see GOLIVE-PROXY.md's "never given to users" rule).
 */
export function serverApiOrigin(): string {
  if (process.env.ARENA_API_ORIGIN) return process.env.ARENA_API_ORIGIN;
  // Not production (ARENA_API_ORIGIN unset) - local dev and the Playwright local-test suite
  // both still set NEXT_PUBLIC_API_BASE_URL to an absolute URL (http://localhost:8081/api/v1,
  // or the test suite's own stub host), so its origin is the right fallback. Falls back to the
  // plain local backend default only if that string isn't a parseable absolute URL at all.
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").origin;
  } catch {
    return "http://localhost:8081";
  }
}

/** The header arena-api's trusted-proxy filter requires from anything that isn't a browser
 *  request arriving through the Vercel proxy — i.e. a server-side fetch made directly from
 *  this app's own server code (generateMetadata, etc). Absent in local dev, where the
 *  backend's `local` profile exempts every request from the check. */
export function serverApiHeaders(): HeadersInit {
  const secret = process.env.ARENA_PROXY_SECRET;
  return secret ? { "X-Arena-Proxy-Secret": secret } : {};
}
