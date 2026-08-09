import { NextResponse, type NextRequest } from "next/server";
import { landingRouteForRole, verifySessionToken } from "@/lib/serverSession";

// ARENA-SHIP-IT.md #8: "keep staging PRIVATE - add ... a simple access gate (basic auth or an
// allowlist) so it is testable-by-link but not public/indexed." Dormant unless STAGING_BASIC_AUTH
// is set (format "user:password") - local dev and (eventually, deliberately) real production both
// run with this unset, so this never gates anyone by accident outside the staging deploy that
// explicitly opts in via its own env var.
const CREDENTIALS = process.env.STAGING_BASIC_AUTH;

function checkStagingGate(request: NextRequest): NextResponse | null {
  if (!CREDENTIALS) return null;
  // Only reached when STAGING_BASIC_AUTH is actually set - i.e. never in production. Keeps
  // the "not public/indexed" half of ARENA-SHIP-IT.md #8 paired with the access gate itself,
  // instead of as a separate always-on header in next.config.ts (which previously kept
  // shipping noindex on the live production domain after the gate went dormant there).
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded === CREDENTIALS) return null; // pass, caller sets the noindex header
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Arena Staging"' },
  });
}

// ARENA-MASTER-ARCHITECTURE.md PART 11: "do the role-based redirect server-side" - the
// specific waterfall MOBILE-PERF-BASELINE.md measured on /auth was load JS -> hydrate ->
// read localStorage -> client router.push(). Resolving it here means an already-signed-in
// visitor to /auth never downloads/hydrates that page's JS at all; the redirect happens
// before any response body is sent. Scoped to /auth only for now - the much larger task of
// migrating every protected route's client-side requireOnboarded() guard (see auth-guard.ts,
// ~26 call sites) to a server-resolved equivalent is tracked separately in ROUTES.md/PART 15,
// not silently skipped.
async function resolveAuthPageRedirect(request: NextRequest): Promise<NextResponse | null> {
  if (request.nextUrl.pathname !== "/auth") return null;
  const token = request.cookies.get("arena_session")?.value;
  const claims = await verifySessionToken(token);
  if (!claims) return null;
  return NextResponse.redirect(new URL(landingRouteForRole(claims.role), request.url));
}

export async function middleware(request: NextRequest) {
  const gated = checkStagingGate(request);
  if (gated) return gated;

  const authRedirect = await resolveAuthPageRedirect(request);
  if (authRedirect) return authRedirect;

  const res = NextResponse.next();
  if (CREDENTIALS) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Excludes Next's own static assets (no sensitive content, gating them just breaks image/font
  // loading behind the auth prompt) and /api/health (Railway's healthcheck prober can't present
  // a Basic Auth credential - see api/health/route.ts).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
