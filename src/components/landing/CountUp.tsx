"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./CountUpAnimator").then((m) => m.CountUpAnimator), { ssr: false });

/** Animates 0 -> end once the element scrolls into view. Mirrors the prototype's [data-count] counters. */
export function CountUp({ end, className }: { end: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  // Reduced-motion path needs no gsap at all - plain DOM write, stays here rather than pulling
  // in the dynamic chunk for a case that never animates anyway.
  useEffect(() => {
    if (reduced && ref.current) ref.current.textContent = String(end);
  }, [reduced, end]);

  return (
    <span ref={ref} className={className}>
      0{!reduced && <Animator elRef={ref} end={end} />}
    </span>
  );
}
