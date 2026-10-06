"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, press, spring } from "@/lib/motion";

type Variant = "primary" | "outline" | "white" | "link";

// White on brand orange is 3.12:1, so the primary label is sized as WCAG "large text"
// (≥ 18.66px bold, 3:1) instead of darkening the brand colour. See docs/design/DECISIONS.md.
const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-button outline-none transition-colors duration-200 motion-reduce:transition-none motion-reduce:duration-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary:
    "h-[52px] w-full bg-primary px-6 text-[19px] font-bold tracking-[-0.01em] text-white hover:bg-primary-pressed active:bg-primary-pressed disabled:bg-primary/45 disabled:text-white/80",
  outline:
    "h-[52px] w-full border border-foreground/70 bg-transparent px-6 text-[17px] font-semibold text-foreground hover:bg-foreground/5 active:bg-foreground/10 disabled:opacity-50",
  white:
    "h-[52px] w-full bg-white px-6 text-[17px] font-semibold text-paper-ink hover:bg-paper active:bg-paper-muted disabled:opacity-50",
  link: "min-h-11 px-1 text-[15px] font-semibold text-primary underline-offset-4 hover:underline active:opacity-70",
};

function Label({ children, loading, success }: { children: ReactNode; loading?: boolean; success?: boolean }) {
  return (
    <>
      <span className={cn("inline-flex items-center gap-2 transition-opacity duration-200", (loading || success) && "opacity-0")}>
        {children}
      </span>
      <AnimatePresence initial={false}>
        {loading && !success && (
          <m.span
            key="loading"
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.fast }}
          >
            <LoaderCircle className="size-5 animate-spin" strokeWidth={2.25} aria-hidden />
          </m.span>
        )}
        {success && (
          <m.span
            key="success"
            className="absolute inset-0 grid place-items-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.success}
          >
            <Check className="size-6" strokeWidth={2.75} aria-hidden />
          </m.span>
        )}
      </AnimatePresence>
    </>
  );
}

type ButtonProps = Omit<ComponentProps<typeof m.button>, "children"> & {
  variant?: Variant;
  loading?: boolean;
  success?: boolean;
  children: ReactNode;
};

/** Every B+ action: 0.97 press + tint, visible keyboard focus, and a loading state that keeps
 *  the button's width (the label stays in layout, invisible) so nothing jumps. */
export function Button({ variant = "primary", loading, success, className, disabled, children, ...rest }: ButtonProps) {
  return (
    <m.button
      whileTap={disabled || loading ? undefined : press}
      transition={{ duration: duration.fast, ease: ease.out }}
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <Label loading={loading} success={success}>{children}</Label>
      {(loading || success) && <span className="sr-only" role="status">{success ? "Done" : "Working"}</span>}
    </m.button>
  );
}

const MotionLink = m.create(Link);

type ButtonLinkProps = Omit<ComponentProps<typeof MotionLink>, "children"> & { variant?: Variant; children: ReactNode };

export function ButtonLink({ variant = "primary", className, children, ...rest }: ButtonLinkProps) {
  return (
    <MotionLink
      whileTap={press}
      transition={{ duration: duration.fast, ease: ease.out }}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      {children}
    </MotionLink>
  );
}
