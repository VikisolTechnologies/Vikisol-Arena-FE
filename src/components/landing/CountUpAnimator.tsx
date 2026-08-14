"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap, ScrollTrigger } from "@/lib/gsap";

/** CountUp's scroll-triggered count animation, split out for the same next/dynamic code-split
 *  reason as HeroAnimator. The reduced-motion path (set the final number immediately) needs no
 *  gsap at all and stays in CountUp.tsx itself — only mounted here when `!reduced`. If this
 *  chunk is slow to load, the counter simply stays at its initial "0" text a little longer
 *  before animating — a real but low-severity degradation (a visible wrong number, not
 *  invisible content), and scroll-gated on top of that. */
export function CountUpAnimator({ elRef, end }: { elRef: RefObject<HTMLSpanElement | null>; end: number }) {
  const gsap = useGsap();

  useGSAP(() => {
    if (!elRef.current) return;
    ScrollTrigger.create({
      trigger: elRef.current,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(elRef.current, {
          innerText: end,
          duration: 1.4,
          snap: { innerText: 1 },
          ease: "power2.out",
        }),
    });
  }, [end]);

  return null;
}
