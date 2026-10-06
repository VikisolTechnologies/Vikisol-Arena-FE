import { useSyncExternalStore } from "react";
import { getSession } from "@/lib/session";

function subscribeSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("arena-session", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("arena-session", onChange);
  };
}

function subscribeNetwork(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** null while server-rendering, then whether this browser has no session. */
export function useGuest(): boolean | null {
  return useSyncExternalStore(subscribeSession, () => getSession() == null, () => null);
}

export function useSessionName(): string {
  return useSyncExternalStore(subscribeSession, () => getSession()?.name ?? "", () => "");
}

export function useSessionRole(): string {
  return useSyncExternalStore(subscribeSession, () => getSession()?.role ?? "", () => "");
}

export function useOffline(): boolean {
  return useSyncExternalStore(subscribeNetwork, () => typeof navigator !== "undefined" && !navigator.onLine, () => false);
}
