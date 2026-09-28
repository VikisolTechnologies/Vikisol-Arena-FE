import { cn } from "@/lib/utils";

/**
 * docs/design/TOKENS.md — "an SVG component of the orange 'A' chevron mark + lowercase
 * 'arena' wordmark". The mark is a simple roof/chevron shape (two angled strokes meeting at
 * a peak) rather than a literal glyph "A" — matches the small mark used top-left of every B+
 * board. `variant="mark"` for tight spaces (tab bar, favicon-adjacent use), `"full"` for
 * headers/splash where the wordmark fits.
 */
export function ArenaLogo({
  variant = "full",
  className,
}: {
  variant?: "mark" | "full";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-[1em] shrink-0"
        fill="none"
      >
        <path
          d="M12 3 L21 20 L14.5 20 L12 14.5 L9.5 20 L3 20 Z"
          fill="var(--color-primary)"
        />
      </svg>
      {variant === "full" && (
        <span className="font-[family-name:var(--font-display-serif)] text-[1em] font-semibold lowercase leading-none">
          arena
        </span>
      )}
    </span>
  );
}
