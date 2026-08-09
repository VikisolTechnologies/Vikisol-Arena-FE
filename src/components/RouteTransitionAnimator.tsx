"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/** The actual gsap timeline for RouteTransition's progress bar, split into its own file
 *  specifically so it's a genuine next/dynamic code-split boundary (see RouteTransition.tsx's
 *  comment for why a plain `import("gsap")` inside an always-mounted component didn't achieve
 *  that on its own). Only ever loaded once a real transition needs to play. */
export default function RouteTransitionAnimator({
  barRef,
  trigger,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  trigger: string;
}) {
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    gsap
      .timeline()
      .set(bar, { scaleX: 0, opacity: 1 })
      .to(bar, { scaleX: 0.7, duration: 0.35, ease: "power2.out" })
      .to(bar, { scaleX: 1, duration: 0.2, ease: "power1.in" })
      .to(bar, { opacity: 0, duration: 0.25, delay: 0.05 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}
