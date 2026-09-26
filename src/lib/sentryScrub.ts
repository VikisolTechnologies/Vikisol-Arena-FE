type SentryRequest = {
  cookies?: unknown;
  data?: unknown;
  headers?: Record<string, string>;
};

type SentryEvent = {
  request?: SentryRequest;
};

const SENSITIVE_HEADERS = new Set(["authorization", "cookie", "set-cookie", "proxy-authorization"]);

// Session Replay is not registered. This only removes request cookies, auth headers, and the body
// before an event leaves the process. The DSN stays in the environment.
export function scrubSentryEvent<T extends SentryEvent>(event: T): T {
  const request = event.request;
  if (!request) return event;
  delete request.cookies;
  delete request.data;
  if (request.headers) {
    for (const name of Object.keys(request.headers)) {
      if (SENSITIVE_HEADERS.has(name.toLowerCase())) delete request.headers[name];
    }
  }
  return event;
}
