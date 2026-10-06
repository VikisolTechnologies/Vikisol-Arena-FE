"use client";

import { WifiOff } from "lucide-react";
import { useApiDown } from "@/lib/api/apiHealth";

/** Global "can't reach the backend" signal — one banner instead of every page's data-fetching
 * effect needing its own error UI. */
export function ApiDownBanner() {
  const down = useApiDown();
  if (!down) return null;

  // SERVER-PERF.md - reworded for the person actually seeing this (was written for a developer:
  // "check that arena-api is running"). This fires the moment a request times out (see
  // httpClient.ts's REQUEST_TIMEOUT_MS), not only on a hard failure, so it needs to read as
  // "hang on" rather than "something is broken" - it clears itself the moment any request
  // succeeds again, no page refresh needed.
  return (
    <div className="fixed inset-x-0 top-0 z-[1000] flex items-center justify-center gap-2 bg-red-500/90 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur-sm">
      <WifiOff className="size-4 shrink-0 animate-pulse" />
      Having trouble reaching Arena — retrying automatically…
    </div>
  );
}
