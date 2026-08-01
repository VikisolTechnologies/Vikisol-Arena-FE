import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const MANUAL_KEY = "arena_reduced_effects";
const MANUAL_EVENT = "arena:reduced-motion-changed";

export function getManualReducedEffects() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MANUAL_KEY) === "true";
}

export function setManualReducedEffects(value: boolean) {
  localStorage.setItem(MANUAL_KEY, String(value));
  window.dispatchEvent(new Event(MANUAL_EVENT));
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  window.addEventListener(MANUAL_EVENT, callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener(MANUAL_EVENT, callback);
  };
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches || getManualReducedEffects();
}

function getServerSnapshot() {
  return false;
}

/** Mirrors arena-prototype.html's matchMedia guard, OR'd with a manual "reduced effects" setting from /settings. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
