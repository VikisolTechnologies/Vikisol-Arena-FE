import { useSyncExternalStore } from "react";

// Tracks whether the last real-mode network call reached arena-api at all (as opposed to
// reaching it and getting a normal 4xx/5xx). Powers a single global "can't reach the backend"
// banner instead of requiring every page's data-fetching effect to handle this individually -
// see ApiDownBanner.tsx, mounted once in the root layout.
let down = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function reportApiUnreachable() {
  if (down) return;
  down = true;
  notify();
}

export function reportApiReachable() {
  if (!down) return;
  down = false;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return down;
}

function getServerSnapshot() {
  return false;
}

export function useApiDown() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
