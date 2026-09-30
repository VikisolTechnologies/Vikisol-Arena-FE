import { useSyncExternalStore } from "react";

// Global "the access token expired and refresh failed" signal (flow §1.4 / account
// SHARED-CHANGES-NEEDED.md). apiFetch() reports it once per httpClient.ts's 401-then-failed-
// refresh path; SessionExpiredSheet, mounted once in the root layout, is the single place that
// reacts to it, the same pattern as apiHealth.ts's reportApiUnreachable/ApiDownBanner.
let expired = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function reportSessionExpired() {
  if (expired) return;
  expired = true;
  notify();
}

export function clearSessionExpired() {
  if (!expired) return;
  expired = false;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return expired;
}

function getServerSnapshot() {
  return false;
}

export function useSessionExpired() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
