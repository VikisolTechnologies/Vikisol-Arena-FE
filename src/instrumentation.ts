// Server/edge-side Sentry init (Next.js's instrumentation hook convention). Dormant unless
// SENTRY_DSN is set - mirrors arena-api's identical "blank DSN = no-op" pattern
// (PRODUCTION-CHECKLIST.md's error-tracking ask, not wired to require a Sentry account to exist
// yet). No source-map upload is configured (that needs a Sentry auth token this environment
// doesn't have - see BLOCKED.md) - stack traces work, just not de-minified server-side either.
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? "local",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT ?? "local",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      sendDefaultPii: false,
    });
  }
}
