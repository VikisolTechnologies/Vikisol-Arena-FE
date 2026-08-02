"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

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
  const gsap = useGsap();

  useGSAP(() => {
    if (!ref.current || reduced) return;
    gsap.to(ref.current, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      delay,
      ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 86%" },
    });
  }, [reduced]);

  if (as === "h2") {
    return <h2 ref={ref as React.Ref<HTMLHeadingElement>} className={cn(!reduced && "reveal", className)}>{children}</h2>;
  }
  if (as === "p") {
    return <p ref={ref as React.Ref<HTMLParagraphElement>} className={cn(!reduced && "reveal", className)}>{children}</p>;
  }
  return <div ref={ref as React.Ref<HTMLDivElement>} className={cn(!reduced && "reveal", className)}>{children}</div>;
}
