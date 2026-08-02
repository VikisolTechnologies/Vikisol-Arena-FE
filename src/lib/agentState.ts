import { useSyncExternalStore } from "react";

export type AgentOrbState = "idle" | "thinking" | "acting" | "needs-approval";

let state: AgentOrbState = "idle";
const listeners = new Set<() => void>();
let revertTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

/** Sets the orb's global state. With autoRevertMs, it snaps back to idle after that delay
 * unless something else calls setAgentState again first (each call resets the timer). */
export function setAgentState(next: AgentOrbState, opts?: { autoRevertMs?: number }) {
  state = next;
  notify();
  if (revertTimer) clearTimeout(revertTimer);
  revertTimer = opts?.autoRevertMs
    ? setTimeout(() => {
        state = "idle";
        notify();
      }, opts.autoRevertMs)
    : null;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): AgentOrbState {
  return state;
}

function getServerSnapshot(): AgentOrbState {
  return "idle";
}

/** Global agent orb state (idle/thinking/acting/needs-approval) — drives the persistent
 * mini-orb in the app shell and the full orb on /agent so both reflect the same reality. */
export function useAgentState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
