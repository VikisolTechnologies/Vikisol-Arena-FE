"use client";

import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { ArenaBrand, EntryHero, EntryShell, StepProgress, entryFieldClass } from "./chrome";

export function EntryFrame({
  title,
  lede,
  step,
  steps,
  stepLabel,
  children,
  footer,
  wide,
  aside,
}: {
  title: string;
  lede?: string;
  step?: number;
  steps?: number;
  stepLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  aside?: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <EntryShell wide={wide} aside={aside}>
      <ArenaBrand />
      <div key={title} className={cn("mt-6 flex flex-1 flex-col", !reduced && "motion-safe:animate-[entry-in_200ms_ease]")}>
        {steps != null && step != null && <StepProgress step={step} steps={steps} label={stepLabel ?? title} />}
        <EntryHero title={title} lede={lede} />
        <div className="mt-5 flex flex-1 flex-col">{children}</div>
        {footer}
      </div>
    </EntryShell>
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
        "transition-transform duration-150 motion-reduce:transition-none motion-reduce:duration-0 motion-reduce:active:scale-100 active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:opacity-50",
        tone === "primary" ? "bg-primary text-primary-foreground" : "border border-white/15 bg-transparent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export const fieldClass = entryFieldClass;
