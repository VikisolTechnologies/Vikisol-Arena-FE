import { cn } from "@/lib/utils";

/**
 * docs/design/TOKENS.md — the orange "A" chevron mark + lowercase "arena" wordmark, as drawn on
 * every B+ board: a thick, round-capped chevron (an A without its crossbar) and a heavy,
 * tightly-tracked sans wordmark. `variant="mark"` for tight spaces.
 */
export function ArenaLogo({ variant = "full", className }: { variant?: "mark" | "full"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.3em] leading-none", className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.05em] shrink-0" fill="none">
        <path d="M4.5 19.5 L12 5 L19.5 19.5" stroke="var(--primary)" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {variant === "full" && <span className="font-sans font-extrabold lowercase tracking-[-0.035em]">arena</span>}
      {variant === "mark" && <span className="sr-only">Arena</span>}
    </span>
  );
}
