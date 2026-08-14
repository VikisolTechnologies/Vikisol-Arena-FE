"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** SkillNebula's floating-dot loop, split out for the same next/dynamic code-split reason as
 *  HeroAnimator. Purely decorative continuous motion on elements that are already fully visible
 *  in their natural state — if this chunk is slow, the dots simply sit still until it arrives.
 *  Only mounted when `!reduced` (see SkillNebula.tsx). */
export function SkillNebulaAnimator({
  containerRef,
  delays,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  delays: number[];
}) {
  const gsap = useGsap();

  useGSAP(
    () => {
      if (!containerRef.current) return;
      gsap.utils.toArray<HTMLElement>(".arena-nebula-dot").forEach((dot, i) => {
        gsap.to(dot, {
          y: i % 2 ? -14 : 14,
          x: i % 3 ? 8 : -8,
          duration: 3 + (i % 5),
          delay: delays[i] ?? 0,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      });
    },
    { scope: containerRef, dependencies: [delays] },
  );

  return null;
}
