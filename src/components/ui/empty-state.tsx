import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared empty-state box (ARENA-DEEP-AUDIT.md Phase 3) - consolidates the dashed-border
 * "nothing here" block that was independently reimplemented across ~15 list/table views.
 *
 * ARENA-VISUAL-RICHNESS.md R2: "illustrated (not text-only) empty states... never a bare
 * sentence in the middle of a void." Every call site across the app gets this for free via
 * this one shared component - `icon` is optional so a call site can swap in something more
 * specific (no jobs vs no messages vs no followers) without every one of the ~15 existing
 * callers needing to change; the default (a soft champagne-tinted circle) is still a real
 * illustration, not nothing. Uses `--primary`/`--primary-soft` rather than `--champagne`/
 * `--gold-deep` deliberately - those only resolve inside `[data-theme="product"]`, and
 * EmptyState is still used on ~40+ routes that haven't migrated to that theme yet; `--primary`
 * resolves everywhere (orange on the current dark pages, black on the product theme), so this
 * reads correctly regardless of which theme actually wraps it. */
export function EmptyState({
  title,
  description,
  icon: Icon = Sparkles,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/12">
        <Icon className="size-5 text-primary-soft" />
      </div>
      <h3 className={cn("text-sm", description ? "font-medium" : "text-muted-foreground")}>{title}</h3>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
