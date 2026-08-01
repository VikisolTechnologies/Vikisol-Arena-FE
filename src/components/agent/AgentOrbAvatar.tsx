import { cn } from "@/lib/utils";

export type OrbState = "idle" | "thinking" | "acting" | "needs-approval";

const RING_CLASS: Record<OrbState, string> = {
  idle: "border-primary/30",
  thinking: "border-primary-soft animate-pulse",
  acting: "border-primary-soft",
  "needs-approval": "border-amber-400",
};

/** Compact orb avatar for chat — a lightweight stand-in for the full hero AgentOrb. */
export function AgentOrbAvatar({ state = "idle", size = "md" }: { state?: OrbState; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "size-7" : "size-9";
  return (
    <span
      className={cn(
        "relative shrink-0 rounded-full border-2 transition-colors",
        dims,
        RING_CLASS[state],
      )}
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
