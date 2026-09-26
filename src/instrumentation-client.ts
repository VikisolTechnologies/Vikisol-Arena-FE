// Sentry stays off the first script list. Init runs from a dynamic import after idle,
// in SentryClient, and only when a DSN is configured. This file stays so Next still
// loads the client instrumentation hook.
