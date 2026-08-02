"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { AgentOrbState } from "@/lib/agentState";

const OrbScene = dynamic(() => import("@/components/orb/OrbScene").then((m) => m.OrbScene), { ssr: false });

const RING_CLASS: Record<AgentOrbState, string> = {
  idle: "border-primary/30",
  thinking: "border-primary-soft animate-pulse",
  acting: "border-primary-soft",
  "needs-approval": "border-amber-400",
};

const GLOW: Record<AgentOrbState, string> = {
  idle: "0 0 20px rgba(255,138,91,0.25)",
  thinking: "0 0 28px rgba(255,107,53,0.4)",
  acting: "0 0 34px rgba(255,179,91,0.5)",
  "needs-approval": "0 0 30px rgba(255,107,53,0.55)",
};

/**
 * Agent orb avatar. sm/md are flat CSS discs — cheap, since one renders per chat bubble.
 * lg is the full reactive 3D orb (same OrbMesh as the persistent mini-orb) — used once, in
 * the chat header, where a WebGL canvas is worth the cost.
 */
export function AgentOrbAvatar({ state = "idle", size = "md" }: { state?: AgentOrbState; size?: "sm" | "md" | "lg" }) {
  if (size === "lg") {
    return (
      <div
        className="relative size-14 shrink-0 overflow-hidden rounded-full"
        style={{ boxShadow: GLOW[state] }}
        aria-label={`Agent is ${state.replace("-", " ")}`}
      >
        <OrbScene state={state} cameraDistance={2.4} />
      </div>
    );
  }

  const dims = size === "sm" ? "size-7" : "size-9";
  return (
    <span
      className={cn("relative shrink-0 rounded-full border-2 transition-colors", dims, RING_CLASS[state])}
      style={{
        background: "radial-gradient(circle at 36% 30%, #4a2c1a 0%, #241108 46%, #6e2f12 78%, #FF6B35 100%)",
      }}
      aria-label={`Agent is ${state.replace("-", " ")}`}
    >
      {state === "acting" && (
        <span className="absolute -inset-1 animate-spin rounded-full border border-transparent border-t-primary-soft" />
      )}
    </span>
  );
}
