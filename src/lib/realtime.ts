import type { AgentActivityEvent } from "@/lib/types";

type Listener = (event: AgentActivityEvent) => void;

/** Pub/sub for real agent activity events (e.g. an approved chat intent) pushed via emit(). */
class AgentRealtimeChannel {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: AgentActivityEvent) {
    this.listeners.forEach((l) => l(event));
  }
}

export const agentRealtime = new AgentRealtimeChannel();
