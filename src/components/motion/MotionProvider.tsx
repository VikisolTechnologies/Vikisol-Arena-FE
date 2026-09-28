"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

import loadFeatures from "@/lib/motion-features";

/** Every animation in the app runs inside this: features load with the app (see motion-features), and the OS
 *  reduced-motion setting turns transforms off everywhere without per-component checks. */
export function MotionProvider({ children }: { children: ReactNode }) {
  // Settings → "Reduce motion effects" also turns transforms off, not just the OS setting.
  const manualOrOs = useReducedMotion();
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={manualOrOs ? "always" : "user"}>{children}</MotionConfig>
    </LazyMotion>
  );
}
