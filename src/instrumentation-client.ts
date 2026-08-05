// Client-side Sentry init (Next.js's instrumentation-client.ts convention, auto-loaded before
// hydration - no next.config.ts wrapping needed). Dormant unless NEXT_PUBLIC_SENTRY_DSN is set,
// same pattern as instrumentation.ts's server side.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "local",
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
  });
}
