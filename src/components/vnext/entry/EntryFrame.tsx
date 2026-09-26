"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export function EntryFrame({
  title,
  lede,
  step,
  steps,
  children,
  footer,
}: {
  title: string;
  lede?: string;
  step?: number;
  steps?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link href="/auth" className="inline-flex min-h-11 items-center gap-2 self-start font-display text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-sm text-primary-foreground" aria-hidden>
            a
          </span>
          Arena
        </Link>
        <div
          key={title}
          className={cn("mt-8 flex flex-1 flex-col", !reduced && "motion-safe:animate-[entry-in_200ms_ease]")}
        >
          {steps != null && step != null && (
            <div className="mb-5 flex gap-1.5" aria-hidden>
              {Array.from({ length: steps }, (_, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-white/15")} />
              ))}
            </div>
          )}
          <h1 className="font-display text-[1.75rem] font-bold leading-tight tracking-tight">{title}</h1>
          {lede && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{lede}</p>}
          <div className="mt-6 flex flex-1 flex-col">{children}</div>
          {footer}
        </div>
      </div>
    </div>
  );
}

export function EntryButton({
  children,
  type = "button",
  disabled,
  onClick,
  tone = "primary",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "ghost";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold",
        "transition-transform duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 active:scale-[0.97]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:opacity-50",
        tone === "primary" ? "bg-primary text-primary-foreground" : "border border-border bg-transparent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export const fieldClass =
  "h-11 w-full rounded-2xl border border-border bg-white/[0.03] px-3 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
