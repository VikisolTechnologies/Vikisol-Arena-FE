import { useSyncExternalStore } from "react";

// Matches the sm breakpoint already used throughout this codebase (e.g. PersistentOrb's own
// `sm:right-7`) - same cutoff, just also readable from JS.
const QUERY = "(max-width: 639px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** Same useSyncExternalStore pattern as use-reduced-motion.ts. Distinct from motion preference -
 * this is about device capability/battery cost (e.g. skipping a persistent WebGL render loop on
 * a small mobile viewport), not the user's stated animation preference. */
export function useIsMobileViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
