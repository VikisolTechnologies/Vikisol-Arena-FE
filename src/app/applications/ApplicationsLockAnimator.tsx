"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** The "interview confirmed" lock-icon pop, split out for the same next/dynamic code-split
 *  reason as HeroAnimator. Only ever relevant inside a modal reached after a real user action
 *  (confirming an interview slot) — nowhere near this app's initial load path regardless, but
 *  still counted as a "used somewhere" static gsap import under Turbopack's commons-chunking
 *  before this change (see MOBILE-PERF-BASELINE.md). `.fromTo()` sets both states via JS, so it
 *  degrades safely (icon just appears at full size/opacity) if this chunk is slow. */
export function ApplicationsLockAnimator({ lockRef }: { lockRef: RefObject<HTMLDivElement | null> }) {
  const gsap = useGsap();

  useGSAP(() => {
    if (!lockRef.current) return;
    gsap.fromTo(lockRef.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" });
  }, []);

  return null;
}
