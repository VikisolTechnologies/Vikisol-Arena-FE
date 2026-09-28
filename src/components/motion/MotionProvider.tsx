"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";

import loadFeatures from "@/lib/motion-features";

/** Every animation in the app runs inside this: features load with the app (see motion-features), and the OS
 *  reduced-motion setting turns transforms off everywhere without per-component checks. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
