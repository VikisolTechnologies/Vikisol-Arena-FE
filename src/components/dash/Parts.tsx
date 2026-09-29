"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { m } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { CountUp } from "@/components/bplus/CountUp";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** A dashboard panel: surface card with a heading and an optional action. */
export function Panel({ title, action, children, className, tone = "surface" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; tone?: "surface" | "paper" }) {
  return (
    <section data-surface={tone === "paper" ? "paper" : undefined} className={cn("rounded-tile p-5", tone === "paper" ? "bg-paper text-paper-ink" : "border border-line bg-surface", className)} aria-label={title}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A number that counts up once, with its label (flow §11). */
export function Stat({ icon: IconCmp, value, label, href, tone = "primary" }: { icon: Icon; value: number; label: string; href?: string; tone?: "primary" | "success" | "info" | "warning" }) {
  const toneCls = { primary: "bg-primary/15 text-primary", success: "bg-success/15 text-success-on-dark", info: "bg-info/15 text-info-on-dark", warning: "bg-warning/15 text-warning" }[tone];
  const body = (
    <>
      <span className={cn("grid size-10 place-items-center rounded-xl", toneCls)}><IconCmp className="size-5" strokeWidth={1.9} aria-hidden /></span>
      <p className="mt-3 font-display-serif text-[32px] font-medium leading-none"><CountUp value={value} /></p>
      <p className="mt-1 text-[14px] text-faint">{label}</p>
    </>
  );
  const cls = "block rounded-tile border border-line bg-surface p-4 outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary";
  return href ? (
    <m.div whileTap={press} transition={spring.snappy}>
      <Link href={href} className={cn(cls, "hover:border-foreground/25")}>{body}</Link>
    </m.div>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const PILL: Record<string, string> = {
  open: "bg-success/15 text-success-on-dark",
  published: "bg-success/15 text-success-on-dark",
  active: "bg-success/15 text-success-on-dark",
  paused: "bg-warning/15 text-warning",
  draft: "bg-foreground/10 text-faint",
  closed: "bg-foreground/10 text-faint",
  suspended: "bg-danger/15 text-danger-on-dark",
  invited: "bg-info/15 text-info-on-dark",
};
const PILL_PAPER: Record<string, string> = {
  open: "bg-success-on-paper text-white",
  published: "bg-success-on-paper text-white",
  active: "bg-success-on-paper text-white",
  paused: "bg-warning/30 text-paper-ink",
  suspended: "bg-danger-on-paper text-white",
  invited: "bg-info-on-paper text-white",
};
const PILL_LABEL: Record<string, string> = { open: "Published" };

export function StatusPill({ status, onPaper = false }: { status: string; onPaper?: boolean }) {
  const cls = onPaper ? PILL_PAPER[status] ?? "bg-paper-ink/10 text-paper-ink-muted" : PILL[status] ?? "bg-foreground/10 text-faint";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize", cls)}>{PILL_LABEL[status] ?? status}</span>;
}

/** A tappable list row for dashboards (people, jobs, interviews). */
export function Row({ href, onClick, lead, title, meta, trail }: { href?: string; onClick?: () => void; lead?: ReactNode; title: ReactNode; meta?: ReactNode; trail?: ReactNode }) {
  const body = (
    <>
      {lead}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        {meta && <span className="block truncate text-[13px] text-faint">{meta}</span>}
      </span>
      {trail}
      {(href || onClick) && <ChevronRight className="size-5 shrink-0 text-faint" aria-hidden />}
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-colors duration-200 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary";
  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return <div className={cls}>{body}</div>;
}

/** Compact button for dashboards (the kit's Button is full-width mobile). */
export function DashButton({ children, onClick, href, variant = "primary", disabled, type = "button", onPaper = false }: { children: ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "outline" | "danger"; disabled?: boolean; type?: "button" | "submit"; onPaper?: boolean }) {
  const cls = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
    variant === "primary" && "bg-primary text-paper-ink hover:bg-primary-pressed",
    variant === "outline" && (onPaper ? "border border-paper-ink/30 text-paper-ink hover:bg-paper-ink/5" : "border border-field-line text-foreground hover:bg-foreground/5"),
    variant === "danger" && (onPaper ? "border border-danger-on-paper/60 text-danger-on-paper hover:bg-danger/10" : "border border-danger/60 text-danger-on-dark hover:bg-danger/10"),
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <m.button type={type} whileTap={disabled ? undefined : press} transition={spring.snappy} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </m.button>
  );
}
