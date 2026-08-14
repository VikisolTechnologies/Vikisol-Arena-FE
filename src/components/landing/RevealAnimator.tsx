"use client";

import type { RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** Reveal's scroll-triggered fade/slide-up tween, split into its own file for the same
 *  next/dynamic code-split reason as HeroAnimator (see that file's comment). Unlike Hero,
 *  this element is scroll-gated (ScrollTrigger only fires once actually scrolled into view) —
 *  a user needs to scroll there first, which in practice gives this dynamic chunk meaningfully
 *  more time to load than an above-the-fold animation ever gets, so it doesn't carry the same
 *  CSS-fallback requirement Hero needed. Only mounted when `!reduced` (see Reveal.tsx). */
export function RevealAnimator({ elRef, delay }: { elRef: RefObject<HTMLElement | null>; delay: number }) {
  const gsap = useGsap();

  useGSAP(() => {
    if (!elRef.current) return;
    gsap.to(elRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      delay,
      ease: "power3.out",
      scrollTrigger: { trigger: elRef.current, start: "top 86%" },
    });
  }, [delay]);

  return null;
}
