import { API_BASE_URL } from "./mode";
import { reportApiUnreachable, reportApiReachable } from "./apiHealth";
import { clearSessionExpired, reportSessionExpired } from "./sessionExpired";
import { MISSING_DOB_MESSAGE, reportMissingDob } from "./missingDob";
import { clearSession } from "@/lib/session";

const TOKEN_KEY = "arena_jwt_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  clearSessionExpired();
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// SERVER-PERF.md - the original symptom ("home 30s, sign-in 7s, then a long blank wait before
// anything showed") wasn't the backend actually taking that long once warm (see SERVER-PERF.md's
// cold-curl numbers); it was that `fetch()` had NO timeout at all, so a slow/stalled connection
// just sat there indefinitely with nothing telling the user anything was wrong. The
// `reportApiUnreachable()` banner mechanism (ApiDownBanner.tsx) already existed - it just never
// fired for "slow," only for "fully failed." The public site reaches the API through
// Vercel and the home tunnel, so a phone photo or a cold hop can take longer than a
// laptop curl. Ordinary calls wait 20s, uploads 60s. Idempotent GETs try once more
// before the app says the backend is unreachable.
const REQUEST_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 60_000;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildQuery(query?: RequestOptions["query"]) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Access tokens are now 15-minute-lived (see DECISIONS.md's JWT hardening entry), so a session
// that's been open a while needs to silently refresh rather than 401ing on the user mid-task.
// The refresh token itself is an HttpOnly cookie (never touches JS) - `credentials: "include"`
// on every request is what lets the browser attach/receive it. Concurrent 401s (several requests
// in flight when the token expires) share one in-flight refresh instead of each independently
// rotating the refresh token - see RefreshTokenService's reuse-detection on the backend, which
// would otherwise treat a second concurrent refresh call as token theft and revoke everything.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); // refresh is an ordinary JSON call
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include", signal: controller.signal })
          .finally(() => clearTimeout(timeout));
        if (!res.ok) return null;
        const json = (await res.json()) as { data?: { token?: string } };
        const token = json?.data?.token;
        if (token) setToken(token);
        return token ?? null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/**
 * arena-api wraps every response in ApiResponse<T> = { success, message, data } (mirrors
 * HRLMS-BE's own envelope, per arena-api's own build notes). This unwraps `data` on success
 * and throws ApiError with the envelope's message on failure/non-2xx, so every real-mode
 * function in src/lib/api/* just gets back the plain T it already returns in mock mode.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, formData, query } = options;

  const doFetch = (token: string | null) => {
    const headers: Record<string, string> = {};
    if (!formData) headers["Content-Type"] = "application/json";
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? (formData ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS));
    return fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      credentials: "include",
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
  };

  let res: Response;
  try {
    try {
      res = await doFetch(getToken());
    } catch (first) {
      // A dropped connection or a timeout on a read is safe to try once more. Writes are not.
      if (method !== "GET") throw first;
      res = await doFetch(getToken());
    }
  } catch {
    // Either fetch() failed outright (connection refused, DNS failure, offline) or the
    // request abort fired - both mean "the user is looking at nothing happening,"
    // so both get the same global "having trouble reaching Arena" treatment rather than a
    // silently-hanging or console-only failure.
    reportApiUnreachable();
    throw new ApiError(0, "Can't reach the Arena backend right now.");
  }
  reportApiReachable();

  // Skip the auth endpoints themselves - a 401 from /auth/signin or /auth/refresh means the
  // credentials/refresh token are genuinely invalid, not "the access token just expired,"
  // and retrying through refreshAccessToken() there would either loop or refresh with a token
  // that was never the problem in the first place.
  if (res.status === 401 && auth && !path.startsWith("/auth/")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        res = await doFetch(newToken);
      } catch {
        reportApiUnreachable();
        throw new ApiError(0, "Can't reach the Arena backend right now.");
      }
    } else {
      // Drafts (intake, compose, ...) live under their own localStorage keys, untouched by
      // clearSession() - only the session record goes, same as an explicit sign-out.
      clearToken();
      clearSession();
      reportSessionExpired();
    }
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const envelope = json as { success?: boolean; message?: string; data?: T } | null;

  if (!res.ok || envelope?.success === false) {
    const message = envelope?.message || `Request failed (${res.status})`;
    // MARATHON-FE-2 Step 0: AgeUtil.requireDateOfBirth() refuses any write with this exact
    // message for an account with no date of birth on file (phone/Google sign-up that never hit
    // onboarding's age gate). Reported globally so MissingDobSheet can show the link to add it,
    // without every write call site needing its own special case - the thrown ApiError below
    // still carries the same message for whatever local error text the caller already shows.
    if (message === MISSING_DOB_MESSAGE) reportMissingDob();
    throw new ApiError(res.status, message);
  }

  if (envelope && typeof envelope === "object" && "data" in envelope) return envelope.data as T;
  return json as T;
}
