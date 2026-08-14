"use client";

import { useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

const Animator = dynamic(() => import("./RevealAnimator").then((m) => m.RevealAnimator), { ssr: false });

type Tag = "div" | "h2" | "p";

/**
 * Scroll-triggered fade/slide-up, one ScrollTrigger per instance — mirrors the prototype's
 * `.reveal:not([data-hero])` pass (Hero's own elements use a stagger group instead, see Hero.tsx).
 * `as` is a closed union (only the tags actually used) rather than a generic ElementType —
 * a generic here makes TS collapse the JSX `children` prop to `never`.
 */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  children,
}: {
  as?: Tag;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const animator = !reduced && <Animator elRef={ref} delay={delay} />;

  if (as === "h2") {
    return (
      <h2 ref={ref as React.Ref<HTMLHeadingElement>} className={cn(!reduced && "reveal", className)}>
        {children}
        {animator}
      </h2>
    );
  }
  if (as === "p") {
    return (
      <p ref={ref as React.Ref<HTMLParagraphElement>} className={cn(!reduced && "reveal", className)}>
        {children}
        {animator}
      </p>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={cn(!reduced && "reveal", className)}>
      {children}
      {animator}
    </div>
  );
}
