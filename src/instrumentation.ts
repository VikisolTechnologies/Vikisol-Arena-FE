import { scrubSentryEvent } from "@/lib/sentryScrub";

// Server/edge-side Sentry init. Dormant unless SENTRY_DSN is set. Session Replay is not
// registered. No source-map upload is configured.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  const options = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? "local",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
    beforeSend(event: unknown) {
      scrubSentryEvent(event as { request?: { cookies?: unknown; data?: unknown; headers?: Record<string, string> } });
      return event;
    },
  };

  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init(options as Parameters<typeof Sentry.init>[0]);
  }
}
