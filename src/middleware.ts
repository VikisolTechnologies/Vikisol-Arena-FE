import { NextResponse, type NextRequest } from "next/server";

// ARENA-SHIP-IT.md #8: "keep staging PRIVATE - add ... a simple access gate (basic auth or an
// allowlist) so it is testable-by-link but not public/indexed." Dormant unless STAGING_BASIC_AUTH
// is set (format "user:password") - local dev and (eventually, deliberately) real production both
// run with this unset, so this never gates anyone by accident outside the staging deploy that
// explicitly opts in via its own env var.
const CREDENTIALS = process.env.STAGING_BASIC_AUTH;

export function middleware(request: NextRequest) {
  if (!CREDENTIALS) return NextResponse.next();

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    if (decoded === CREDENTIALS) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Arena Staging"' },
  });
}

export const config = {
  // Everything except Next's own static assets - those have no sensitive content and gating
  // them just breaks image/font loading behind the auth prompt.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
