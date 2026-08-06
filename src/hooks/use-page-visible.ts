import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function getSnapshot() {
  return document.visibilityState === "visible";
}

function getServerSnapshot() {
  return true;
}

/** Same useSyncExternalStore pattern as use-reduced-motion.ts. Drives frameloop pausing on
 * always-on WebGL scenes (persistent orb, dashboard gauge) - per ARENA-PERFORMANCE.md Step 2,
 * stopping the render loop on tab blur is "the single biggest battery/CPU win on phones." The
 * scene itself is untouched; this only controls whether it keeps rendering while unseen. */
export function usePageVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
