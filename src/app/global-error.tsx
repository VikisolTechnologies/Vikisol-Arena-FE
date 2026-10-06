"use client";

import { useEffect } from "react";

// Capture runs through a dynamic import so the Sentry SDK is not in the first
// script list of every page. If no DSN was set, init never ran and this is a no-op.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="font-display text-xl font-bold">Something went wrong.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          We&apos;ve been notified. Try refreshing, or come back in a moment.
        </p>
      </body>
    </html>
  );
}
