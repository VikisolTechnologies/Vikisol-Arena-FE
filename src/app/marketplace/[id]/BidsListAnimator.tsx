"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** The project-detail bids-list stagger-in, split out for the same next/dynamic code-split
 *  reason as HeroAnimator. `.from()` on elements already visible in their natural state, so it
 *  degrades safely (list just appears without the stagger) if this chunk is slow. */
export function BidsListAnimator({
  bidsListRef,
  bidsCount,
}: {
  bidsListRef: RefObject<HTMLDivElement | null>;
  bidsCount: number;
}) {
  const gsap = useGsap();

  useGSAP(
    () => {
      if (!bidsListRef.current) return;
      gsap.from(bidsListRef.current.children, { opacity: 0, x: 24, duration: 0.5, stagger: 0.06, ease: "power2.out" });
    },
    { dependencies: [bidsCount] },
  );

  return null;
}
