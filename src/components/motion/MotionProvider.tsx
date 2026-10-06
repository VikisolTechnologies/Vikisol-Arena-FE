"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LazyMotion, MotionConfig, type FeatureBundle } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import loadFeatures from "@/lib/motion-features";

// Drag/layout (layoutId) only ship in domMax, fetched at idle and swapped into the SAME
// LazyMotion below — a sibling LazyMotion wrapping nothing (the previous approach) never reaches
// the real tree's context, so layoutId users (feed cards) would silently never animate, and in
// strict mode threw instead: any m component asking for layoutId before domMax loaded crashed
// AnimatePresence mid-transition, wedging the feed on its first filter change (root cause of the
// feed-nearby.local.ts "All" failure). Not strict here: until domMax lands, those components
// degrade (a pill jumps instead of sliding) instead of throwing.
const afterLoadIdle = () =>
  new Promise<void>((resolve) => {
    const idle = () => ("requestIdleCallback" in window ? window.requestIdleCallback(() => resolve(), { timeout: 3000 }) : setTimeout(resolve, 500));
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });

/** Every animation in the app runs inside this: core features load with the app, drag/layout at
 *  idle (see motion-features), and the reduced-motion setting turns transforms off everywhere. */
export function MotionProvider({ children }: { children: ReactNode }) {
  // Settings → "Reduce motion effects" also turns transforms off, not just the OS setting.
  const manualOrOs = useReducedMotion();
  const [features, setFeatures] = useState<FeatureBundle>(() => loadFeatures);
  useEffect(() => {
    let cancelled = false;
    afterLoadIdle()
      .then(() => import("@/lib/motion-features-max"))
      .then((m) => !cancelled && setFeatures(m.default));
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <LazyMotion features={features}>
      <MotionConfig reducedMotion={manualOrOs ? "always" : "user"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
