"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** OpenMarket's `.arena-bid-row` scroll-triggered stagger, split out for the same next/dynamic
 *  code-split reason as HeroAnimator. Uses `.from()` on elements with no CSS-hidden initial
 *  state (see that file's comment on why this degrades safely) — and is scroll-gated on top of
 *  that, so it has ample time to load before it's ever visually needed. Only mounted when
 *  `!reduced` (see OpenMarket.tsx). */
export function OpenMarketAnimator({ cardRef }: { cardRef: RefObject<HTMLDivElement | null> }) {
  const gsap = useGsap();

  useGSAP(
    () => {
      if (!cardRef.current) return;
      gsap.from(cardRef.current.querySelectorAll(".arena-bid-row"), {
        x: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: cardRef.current, start: "top 80%" },
      });
    },
    { scope: cardRef },
  );

  return null;
}
