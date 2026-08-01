import type { AgentActivityEvent } from "@/lib/types";
import { generateLiveEvent } from "@/lib/mock/activity";

type Listener = (event: AgentActivityEvent) => void;

/**
 * Simulated realtime feed — periodically emits a fresh agent activity event so the
 * dashboard/journal feel alive without a real backend. Ref-counted: the interval only
 * runs while at least one listener is subscribed.
 */
class AgentRealtimeChannel {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    if (!this.timer) {
      this.timer = setInterval(
        () => {
          const event = generateLiveEvent();
          this.listeners.forEach((l) => l(event));
        },
        8000 + Math.random() * 6000,
      );
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }
}

export const agentRealtime = new AgentRealtimeChannel();
