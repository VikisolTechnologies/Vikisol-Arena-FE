import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared empty-state box (ARENA-DEEP-AUDIT.md Phase 3) - consolidates the dashed-border
 * "nothing here" block that was independently reimplemented across ~15 list/table views. */
export function EmptyState({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      <p className={cn("text-sm", description ? "font-medium" : "text-muted-foreground")}>{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
