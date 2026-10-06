import { useSyncExternalStore } from "react";

/**
 * Global "this write needs a date of birth on file" signal (MARATHON-FE-2 Step 0).
 * `AgeUtil.requireDateOfBirth()` refuses every write action (post, join, message, apply,
 * connect — not reads) for a phone/Google account that never went through onboarding's age gate,
 * with the exact message "Add your date of birth to continue". That message can come from
 * dozens of call sites across the app; rather than teach every one of them to render a link,
 * `apiFetch()` (httpClient.ts) recognises it once and reports it here, the same pattern as
 * `sessionExpired.ts` / `apiHealth.ts`. `MissingDobSheet`, mounted once in the root layout, is
 * the single place that reacts to it. The original `ApiError` is still thrown too, so whatever
 * local error text a screen already shows for that one action is unaffected — this is in
 * addition, not instead.
 */
export const MISSING_DOB_MESSAGE = "Add your date of birth to continue";

let missing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function reportMissingDob() {
  if (missing) return;
  missing = true;
  notify();
}

export function clearMissingDob() {
  if (!missing) return;
  missing = false;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return missing;
}

function getServerSnapshot() {
  return false;
}

export function useMissingDob() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
