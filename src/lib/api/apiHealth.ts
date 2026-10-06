import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "./mode";

// Tracks whether the last real-mode network call reached arena-api at all (as opposed to
// reaching it and getting a normal 4xx/5xx). Powers a single global "can't reach the backend"
// banner instead of requiring every page's data-fetching effect to handle this individually -
// see ApiDownBanner.tsx, mounted once in the root layout.
let down = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

// SERVER-PERF.md - ApiDownBanner tells the user "retrying automatically," which needs to
// actually be true: the request that timed out doesn't retry itself, and most pages only
// fetch once on mount, so without this nothing would ever clear the banner short of the user
// navigating away and back. A lightweight, unauthenticated health poll (not routed through
// apiFetch - this must never itself trigger reportApiUnreachable/a refresh-token dance) is the
// simplest real signal that the backend is reachable again.
const RETRY_POLL_MS = 3000;
const HEALTH_TIMEOUT_MS = 8000;
let retryInterval: ReturnType<typeof setInterval> | null = null;
let healthInFlight = false;

function startRetryLoop() {
  if (retryInterval) return;
  retryInterval = setInterval(async () => {
    // An 8s check must not stack on the 3s poll.
    if (healthInFlight) return;
    healthInFlight = true;
    try {
      const res = await fetch(`${API_BASE_URL}/actuator/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
      if (res.ok) reportApiReachable();
    } catch {
      // Still down - the interval itself is the retry, nothing else to do here.
    } finally {
      healthInFlight = false;
    }
  }, RETRY_POLL_MS);
}

function stopRetryLoop() {
  if (!retryInterval) return;
  clearInterval(retryInterval);
  retryInterval = null;
}

export function reportApiUnreachable() {
  if (!down) {
    down = true;
    notify();
  }
  startRetryLoop();
}

export function reportApiReachable() {
  stopRetryLoop();
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
