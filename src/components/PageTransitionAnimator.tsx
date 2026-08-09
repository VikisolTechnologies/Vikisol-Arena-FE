"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/** The actual gsap entrance tween for PageTransition, split into its own file for the same
 *  genuine-code-split reason as RouteTransitionAnimator — only loaded once a real transition
 *  needs to play, never part of any route's initial bundle. */
export function PageTransitionAnimator({
  containerRef,
  trigger,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  trigger: string;
}) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}
