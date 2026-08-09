import { jwtVerify } from "jose";

/**
 * ARENA-MASTER-ARCHITECTURE.md PART 11 — Edge-runtime-compatible verification of the
 * `arena_session` HttpOnly cookie arena-api now issues (see SessionCookieHelper.java).
 * `jose` (not `jsonwebtoken`) specifically because Next.js middleware runs on the Edge
 * runtime, which has no Node `crypto` module — `jose` uses Web Crypto, which Edge provides.
 *
 * `JWT_SECRET` must be the exact same value as arena-api's — this only verifies a signature
 * arena-api already produced, it never signs anything itself. See DECISIONS.md/BLOCKED.md:
 * copying that value into this app's Railway env is a pending manual step (env-var writes to
 * a live service are outside what this session can do unattended).
 */

export interface ServerSessionClaims {
  userId: string;
  email: string;
  name: string;
  role: string;
}

let cachedKey: Uint8Array | null = null;

function getKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  if (!cachedKey) cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

/** Returns null for: no cookie, invalid/expired signature, or a still-MFA-pending token
 *  (that claim means a password check passed but TOTP hasn't - never treat it as a session,
 *  mirrors JwtTokenProvider.isMfaPending's server-side check exactly). */
export async function verifySessionToken(token: string | undefined): Promise<ServerSessionClaims | null> {
  if (!token) return null;
  const key = getKey();
  if (!key) return null; // JWT_SECRET not configured in this environment - fail closed, not open
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: process.env.JWT_ISSUER ?? "vikisol-arena",
      audience: process.env.JWT_AUDIENCE ?? "vikisol-arena-web",
    });
    if (payload.mfa_pending === true) return null;
    const userId = payload.uid;
    const role = payload.role;
    const name = payload.name;
    const email = payload.sub;
    if (typeof userId !== "string" || typeof role !== "string" || typeof name !== "string" || typeof email !== "string") {
      return null;
    }
    return { userId, email, name, role };
  } catch {
    return null;
  }
}

/** Mirrors auth/page.tsx's redirectForRole - same current-route targets (not the v3 route
 *  map's /home, /workspace, /hm/interviews yet, since those don't exist as real pages until
 *  the shell/nav rebuild lands - this stays non-breaking at every intermediate commit). */
export function landingRouteForRole(role: string): string {
  switch (role) {
    case "company_admin":
      return "/enterprise/admin";
    case "recruiter":
      return "/enterprise";
    case "hiring_manager":
      return "/enterprise/interviews/mine";
    case "platform_admin":
      return "/admin";
    default:
      return "/feed";
  }
}
