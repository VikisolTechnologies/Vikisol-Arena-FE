import { cn } from "@/lib/utils";

/** Orb-themed loading placeholder — CSS only (no WebGL; this shows on nearly every page's
 * initial mount, so a real Canvas here would work against the "lazy-loaded canvases" budget).
 * A breathing gradient orb instead of a plain grey pulse box, on-brand with the agent motif
 * used throughout the shell. Drop-in replacement for the old `h-* animate-pulse` skeletons —
 * pass the same height class through `className`. */
export function OrbLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-2xl border border-border bg-white/[0.02]", className)}>
      <span
        className="size-14 animate-pulse rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, #FF8A5B, #FF6B35 70%)",
          boxShadow: "0 0 32px rgba(255,107,53,0.35)",
        }}
      />
    </div>
  );
}
