"use client";

import { createElement, useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered fade/slide-up, one ScrollTrigger per instance — mirrors the prototype's
 * `.reveal:not([data-hero])` pass (Hero's own elements use a stagger group instead, see Hero.tsx).
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
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

  return createElement(Tag, { ref, className: cn(!reduced && "reveal", className) }, children);
}
