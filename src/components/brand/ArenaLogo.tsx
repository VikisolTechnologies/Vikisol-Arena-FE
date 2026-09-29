import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The board's mark (redrawn 29 Sep to match it): a bold, rounded orange "A" — one thick stroke up
 * the left leg, over a soft apex and down the right, whose foot turns back inward so the counter
 * reads as an open, rounded triangle. Warm two-stop orange, like the boards. `variant="mark"`
 * for tight spaces; `size="hero"` for Welcome, where the mark sits larger than the wordmark.
 */
export function ArenaMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("shrink-0", className)} fill="none">
      <defs>
        <linearGradient id={`arena-g-${id}`} x1="18" y1="10" x2="86" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#f24e1a" />
        </linearGradient>
      </defs>
      <path
        d="M18 82 L44 25 Q50 13 56 25 L80 75 Q84 84 75 84 L60 84"
        stroke={`url(#arena-g-${id})`}
        strokeWidth={21}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArenaLogo({ variant = "full", size = "default", className }: { variant?: "mark" | "full" | "word"; size?: "default" | "hero"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center leading-none", size === "hero" ? "gap-[0.2em]" : "gap-[0.28em]", className)}>
      {variant !== "word" && <ArenaMark className={size === "hero" ? "size-[1.55em]" : "size-[1.15em]"} />}
      {variant !== "mark" && <span className="font-sans font-extrabold lowercase tracking-[-0.035em]">arena</span>}
      {variant === "mark" && <span className="sr-only">Arena</span>}
    </span>
  );
}
