// Client-side Sentry. Dormant unless NEXT_PUBLIC_SENTRY_DSN is set, and even then the SDK is
// imported after the page is idle so it is never part of a route's first-load JS (performance
// pass, docs/reviews/performance.md). Session Replay and Feedback are not registered.
if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== "undefined") {
  const start = () =>
    void Promise.all([import("@sentry/nextjs"), import("@/lib/sentryScrub")]).then(([Sentry, { scrubSentryEvent }]) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "local",
        tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        sendDefaultPii: false,
        integrations: (defaults) => defaults.filter((i) => i.name !== "Replay" && i.name !== "Feedback"),
        beforeSend(event) {
          scrubSentryEvent(event);
          return event;
        },
      });
    });
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 5000 });
  else setTimeout(start, 2000);
}
