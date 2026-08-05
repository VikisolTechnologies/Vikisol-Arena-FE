"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Sentry's recommended App Router hook for uncaught render errors that escape every route's own
// error.tsx (Next.js only invokes global-error.tsx for errors in the root layout itself, hence
// the full <html>/<body> here - it replaces the entire page when it fires). No-ops safely if
// Sentry was never initialized (no DSN set) - captureException just has nowhere to send to.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
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
