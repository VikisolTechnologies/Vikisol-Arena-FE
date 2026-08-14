"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** OnboardingShell's step-transition fade, split out for the same next/dynamic code-split
 *  reason as HeroAnimator. `.fromTo()` sets both start and end state via JS at animation time,
 *  so the content is at its natural (visible) state until this runs — degrades safely if the
 *  chunk is slow. Only mounted when `!reduced` (see OnboardingShell.tsx). */
export function OnboardingShellAnimator({ contentRef, step }: { contentRef: RefObject<HTMLDivElement | null>; step: number }) {
  const gsap = useGsap();

  useGSAP(
    () => {
      if (!contentRef.current) return;
      gsap.fromTo(contentRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
    },
    { dependencies: [step] },
  );

  return null;
}
