import { NextResponse, type NextRequest } from "next/server";

// ARENA-SHIP-IT.md #8: "keep staging PRIVATE - add ... a simple access gate (basic auth or an
// allowlist) so it is testable-by-link but not public/indexed." Dormant unless STAGING_BASIC_AUTH
// is set (format "user:password") - local dev and (eventually, deliberately) real production both
// run with this unset, so this never gates anyone by accident outside the staging deploy that
// explicitly opts in via its own env var.
const CREDENTIALS = process.env.STAGING_BASIC_AUTH;

export function middleware(request: NextRequest) {
  if (!CREDENTIALS) return NextResponse.next();

  // Only reached when STAGING_BASIC_AUTH is actually set - i.e. never in production. Keeps
  // the "not public/indexed" half of ARENA-SHIP-IT.md #8 paired with the access gate itself,
  // instead of as a separate always-on header in next.config.ts (which previously kept
  // shipping noindex on the live production domain after the gate went dormant there).
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded === CREDENTIALS) {
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Arena Staging"' },
  });
}

export const config = {
  // Excludes Next's own static assets (no sensitive content, gating them just breaks image/font
  // loading behind the auth prompt) and /api/health (Railway's healthcheck prober can't present
  // a Basic Auth credential - see api/health/route.ts).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
