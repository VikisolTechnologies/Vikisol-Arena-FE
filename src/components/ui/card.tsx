import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared glass-card surface (ARENA-DEEP-AUDIT.md Phase 3) - the
 * `rounded-[24px] border border-border bg-white/[0.03] p-6` block GAPS.md flagged as
 * independently reimplemented across ~25 files. Pass extra classes (spacing, highlight
 * borders, etc.) via className - twMerge resolves any conflicting utility. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[24px] border border-border bg-white/[0.03] p-6", className)}
      {...props}
    />
  );
}
