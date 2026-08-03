import { API_BASE_URL } from "./mode";

const TOKEN_KEY = "arena_jwt_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
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

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
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

/**
 * arena-api wraps every response in ApiResponse<T> = { success, message, data } (mirrors
 * HRLMS-BE's own envelope, per arena-api's own build notes). This unwraps `data` on success
 * and throws ApiError with the envelope's message on failure/non-2xx, so every real-mode
 * function in src/lib/api/* just gets back the plain T it already returns in mock mode.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, formData, query } = options;
  const headers: Record<string, string> = {};
  if (!formData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const envelope = json as { success?: boolean; message?: string; data?: T } | null;

  if (!res.ok || envelope?.success === false) {
    throw new ApiError(res.status, envelope?.message || `Request failed (${res.status})`);
  }

  if (envelope && typeof envelope === "object" && "data" in envelope) return envelope.data as T;
  return json as T;
}
