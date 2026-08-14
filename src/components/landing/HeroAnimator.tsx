"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** The Hero stagger-reveal tween, split into its own file so it's a genuine next/dynamic
 *  code-split boundary — same reasoning as RouteTransitionAnimator/PageTransitionAnimator/
 *  AuraBackgroundAnimator (see those files' own comments), extended here to the 11 files
 *  MOBILE-PERF-BASELINE.md identified as the remaining reason gsap loads on every route.
 *  `[data-hero]` elements start hidden via the `.reveal` CSS class (globals.css) — if this
 *  animator is slow to load, `.reveal`'s own CSS `animation` fallback guarantees the content
 *  becomes visible within ~2.4s regardless (see globals.css's comment on that rule), so a slow
 *  network degrades this to "content appeared a little late without the stagger flourish,"
 *  never "content stays invisible." Only mounted when `!reduced` (see Hero.tsx) — no internal
 *  reduced-motion check needed here. */
export function HeroAnimator({ scopeRef }: { scopeRef: RefObject<HTMLDivElement | null> }) {
  const gsap = useGsap();

  useGSAP(
    () => {
      gsap.to("[data-hero]", {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.15,
      });
    },
    { scope: scopeRef },
  );

  return null;
}
