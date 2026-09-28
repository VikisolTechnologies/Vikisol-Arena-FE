"use client";

import Link from "next/link";
import { useId, type ComponentType, type ReactNode } from "react";
import { m } from "motion/react";
import { CircleAlert, CircleCheck, CloudOff, Gift, HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/* ── Filter pills (single-select). The active fill slides between options (layoutId). ── */
export function Pills<T extends string>({
  options,
  value,
  onChange,
  label,
  tone = "orange",
  icons,
  segmented = false,
  compact = false,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  tone?: "orange" | "cream";
  icons?: Partial<Record<T, Icon>>;
  /** One connected track with equal-width segments (board: room tabs) instead of loose pills. */
  segmented?: boolean;
  /** Smaller pills so five filters fit one row at 360px (Inbox, Notifications, Search boards). */
  compact?: boolean;
}) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className={segmented ? "grid auto-cols-fr grid-flow-col rounded-full border border-field-line p-1" : cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
      {options.map((o) => {
        const on = o.id === value;
        const IconCmp = icons?.[o.id] as Icon | undefined;
        return (
          <m.button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            whileTap={press}
            transition={spring.snappy}
            className={cn(
              "relative inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium outline-none after:absolute after:-inset-y-1 after:inset-x-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              segmented && "h-10 justify-center",
              compact && "h-8 px-3 text-[13px] after:-inset-y-1.5",
              on ? "text-paper-ink" : cn("text-foreground/90", !segmented && "border border-field-line"),
            )}
          >
            {on && (
              <m.span
                layoutId={`pill-${group}`}
                transition={spring.snappy}
                className={cn("absolute inset-0 rounded-full", tone === "orange" ? "bg-primary" : "bg-paper")}
                aria-hidden
              />
            )}
            {IconCmp && <IconCmp className={cn("relative size-4", on && tone === "cream" && "text-primary-on-paper")} strokeWidth={2} aria-hidden />}
            <span className="relative">{o.label}</span>
          </m.button>
        );
      })}
    </div>
  );
}

/* ── Kind chip on cards: Need / Offer / Activity / Project / Job. ── */
const KIND: Record<string, { label: string; icon: Icon; cls: string }> = {
  ask: { label: "Need", icon: HeartHandshake, cls: "text-primary-on-paper" },
  offer: { label: "Offer", icon: Gift, cls: "text-success-on-paper" },
  activity: { label: "Activity", icon: Users, cls: "text-info-on-paper" },
  project: { label: "Project", icon: ShieldCheck, cls: "text-success-on-paper" },
  job: { label: "Job", icon: ShieldCheck, cls: "text-primary-on-paper" },
};

export function KindChip({ kind }: { kind: string }) {
  const k = KIND[kind] ?? { label: kind[0]?.toUpperCase() + kind.slice(1), icon: Sparkles, cls: "text-paper-ink-muted" };
  const IconCmp = k.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-semibold", k.cls)}>
      <IconCmp className="size-4" strokeWidth={2} aria-hidden />
      {k.label}
    </span>
  );
}

/* ── "Preview data": any screen region showing fixtures must carry this (FE-BPLUS-BUILD §6). ── */
export function PreviewPill({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-warning/60 bg-warning/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning", className)}>
      Preview data
    </span>
  );
}

export function DemoBadge() {
  return <span className="rounded-full bg-paper-ink/10 px-2 py-0.5 text-[11px] font-bold tracking-wide text-paper-ink">DEMO</span>;
}

export function SectionHeader({ title, href, action }: { title: string; href?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[19px] font-semibold text-foreground">{title}</h2>
      {href ? (
        <Link href={href} className="inline-flex min-h-11 items-center text-[14px] text-foreground/85 underline underline-offset-4">
          See all
        </Link>
      ) : (
        action
      )}
    </div>
  );
}

/* ── Honest states: loading / empty / error / offline, one component everywhere. ── */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-[var(--radius-card)] bg-surface motion-reduce:animate-none", className)} />;
}

export function StateCard({
  kind,
  title,
  detail,
  action,
}: {
  kind: "empty" | "error" | "offline" | "saved";
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  const IconCmp = kind === "offline" ? CloudOff : kind === "error" ? CircleAlert : kind === "saved" ? CircleCheck : Sparkles;
  return (
    <div role={kind === "error" ? "alert" : "status"} className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
        <IconCmp className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 font-display-serif text-[21px] leading-tight text-foreground">{title}</p>
      {detail && <p className="mx-auto mt-2 max-w-[34ch] text-[14px] leading-relaxed text-faint">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Horizontal row that scrolls inside itself with an edge fade (never the page). ── */
export function HScroll({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      role="list"
      aria-label={label}
      tabIndex={0}
      className="no-scrollbar rounded-tile outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-24px),transparent)]"
    >
      {children}
    </div>
  );
}
