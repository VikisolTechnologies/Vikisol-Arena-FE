"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Animates 0 -> end once the element scrolls into view. Mirrors the prototype's [data-count] counters. */
export function CountUp({ end, className }: { end: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const gsap = useGsap();

  useGSAP(() => {
    if (!ref.current) return;
    if (reduced) {
      ref.current.textContent = String(end);
      return;
    }
    ScrollTrigger.create({
      trigger: ref.current,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(ref.current, {
          innerText: end,
          duration: 1.4,
          snap: { innerText: 1 },
          ease: "power2.out",
        }),
    });
  }, [reduced, end]);

  return (
    <span ref={ref} className={className}>
      0
    </span>
  );
}
