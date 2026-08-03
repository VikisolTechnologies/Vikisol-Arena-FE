"use client";

import { WifiOff } from "lucide-react";
import { useApiDown } from "@/lib/api/apiHealth";
import { isRealMode } from "@/lib/api/mode";

/** Global "can't reach the backend" signal for real mode — one banner instead of every page's
 * data-fetching effect needing its own error UI. Mock mode never has anything to report here
 * (isRealMode() gates it out entirely), so this renders nothing there. */
export function ApiDownBanner() {
  const down = useApiDown();
  if (!isRealMode() || !down) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[1000] flex items-center justify-center gap-2 bg-red-500/90 px-4 py-2 text-center text-sm font-medium text-white backdrop-blur-sm">
      <WifiOff className="size-4 shrink-0" />
      Can&apos;t reach the Arena backend — check that arena-api is running, then refresh.
    </div>
  );
}
