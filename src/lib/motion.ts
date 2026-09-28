import type { TargetAndTransition, Transition, Variants } from "motion/react";

/**
 * The only place motion numbers live (FE-BPLUS-BUILD §4 + the founder's premium standard):
 * three durations, two springs, overshoot reserved for success moments. Components import
 * from here and never hard-code their own timings.
 */

/** Seconds. fast = presses/tints, base = toggles/chips/fields, slow = dissolves/timelines. */
export const duration = { fast: 0.12, base: 0.2, slow: 0.3 } as const;

export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  /** Sheets, layout, page slides: settles in ~260ms, no bounce. */
  gentle: { type: "spring", stiffness: 380, damping: 34 } satisfies Transition,
  /** Presses, toggles, tile selects: quick and firm. */
  snappy: { type: "spring", stiffness: 620, damping: 34 } satisfies Transition,
  /** Success moments only (check draw, "You're all set"): a small overshoot. */
  success: { type: "spring", stiffness: 420, damping: 14 } satisfies Transition,
} as const;

export const press = { scale: 0.97 } as const;

export const fade = { duration: duration.base, ease: ease.out } satisfies Transition;
export const dissolve = { duration: duration.slow, ease: ease.out } satisfies Transition;

/** Card lists: 40ms apart, capped so a long list never feels slow. */
export const STAGGER_STEP = 0.04;
export const STAGGER_CAP = 8;
export function staggerDelay(index: number) {
  return Math.min(index, STAGGER_CAP) * STAGGER_STEP;
}

export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: (index: number = 0) => ({ opacity: 1, y: 0, transition: { ...fade, delay: staggerDelay(index) } }),
};

/** Direction-aware page slide (onboarding steps, auth views). 1 = forward, -1 = back. */
export const SLIDE_DISTANCE = 24;
export const pageSlide: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: SLIDE_DISTANCE * direction }),
  center: { opacity: 1, x: 0, transition: spring.gentle },
  exit: (direction: number) => ({ opacity: 0, x: -SLIDE_DISTANCE * direction, transition: { duration: duration.fast, ease: ease.out } }),
};

/** Inline error: slides in 4px. The one-time submit shake is separate (see `shake`). */
export const errorIn: Variants = {
  hidden: { opacity: 0, y: -4 },
  shown: { opacity: 1, y: 0, transition: fade },
};

export const shake = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.36, ease: ease.out },
} as const;

/** Welcome hero: slow 12s Ken Burns loop. MotionConfig reducedMotion="user" makes it static. */
export const kenBurns: { animate: TargetAndTransition; transition: Transition } = {
  animate: { scale: [1.04, 1.12], x: ["0%", "-2%"], y: ["0%", "-1.5%"] },
  transition: { duration: 12, ease: "linear", repeat: Infinity, repeatType: "reverse" },
};

/** "Join request sent": the paper plane flies in on a curve (a delight moment, like confetti). */
export const flyIn: { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition } = {
  initial: { x: -70, y: 50, rotate: -28, opacity: 0, scale: 0.7 },
  animate: { x: [-70, -20, 0], y: [50, -12, 0], rotate: [-28, -8, 0], opacity: [0, 1, 1], scale: [0.7, 1, 1] },
  transition: { duration: 0.6, ease: ease.out },
};

/** A check that draws itself on success moments. */
export const drawCheck = { duration: duration.slow, ease: ease.out, delay: 0.12 } satisfies Transition;

/** Profile stats count up once on mount. */
export const countUp = { duration: 0.6, ease: ease.out } satisfies Transition;

/** Jenny's orb: a subtle 1.6s breathing loop (ambient — exempt from the 400ms cap). */
export const breathe: { animate: TargetAndTransition; transition: Transition } = {
  animate: { scale: [1, 1.035, 1], opacity: [0.92, 1, 0.92] },
  transition: { duration: 1.6, ease: "easeInOut", repeat: Infinity },
};

/** Confetti-lite on success moments only. The one timing over 400ms outside ambient loops —
 *  a celebration that finishes in 300ms reads as a glitch, not a moment. */
export const celebrate = { duration: 0.7, ease: ease.out, delay: 0.05 } satisfies Transition;

export function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
}
