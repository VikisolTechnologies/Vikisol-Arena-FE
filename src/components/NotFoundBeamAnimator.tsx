"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** The 404 page's rotating conic-gradient beam, split out for the same next/dynamic code-split
 *  reason as HeroAnimator/RouteTransitionAnimator. Purely decorative continuous rotation on an
 *  element that's already visible (rendered at `opacity-40` via Tailwind) — if this chunk is
 *  slow, the beam just sits still until it arrives. Only mounted when `!reduced` (see
 *  not-found.tsx). */
export function NotFoundBeamAnimator({ beamRef }: { beamRef: RefObject<HTMLDivElement | null> }) {
  const gsap = useGsap();

  useGSAP(() => {
    if (!beamRef.current) return;
    gsap.to(beamRef.current, { rotate: 360, duration: 8, repeat: -1, ease: "none", transformOrigin: "center" });
  }, []);

  return null;
}
