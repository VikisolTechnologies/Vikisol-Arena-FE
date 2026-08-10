import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared glass-card surface (ARENA-DEEP-AUDIT.md Phase 3) - the
 * `rounded-[24px] border border-border bg-white/[0.03] p-6` block GAPS.md flagged as
 * independently reimplemented across ~25 files. Pass extra classes (spacing, highlight
 * borders, etc.) via className - twMerge resolves any conflicting utility.
 *
 * ARENA-DESIGN-SYSTEM.md Step 2: switched the fixed `bg-white/[0.03]` to the semantic
 * `bg-card` token (was already defined, just unused here) so this component reskins
 * correctly under `[data-theme="product"]` (white cards on ivory) without a hardcoded
 * white-tint fighting the override - a literal `bg-white/*` is invisible on a light
 * canvas. Visually identical on the existing dark theme (0.03 vs --card's 0.05 opacity).
 * Radius/shadow are `--radius-card`/`--shadow-card-*` custom properties for the same reason -
 * §4/§6 wants 20px + a soft resting shadow in the product theme specifically, while every
 * still-unmigrated dark page keeps its existing 24px/no-shadow look untouched. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-border bg-card p-6 shadow-[var(--shadow-card-rest)]", className)}
      {...props}
    />
  );
}
