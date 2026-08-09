"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

/** The actual gsap cursor-parallax loop for AuraBackground, split into its own file for the
 *  same genuine-code-split reason as RouteTransitionAnimator — only mounted after the first
 *  real mousemove, so touch visitors (this investigation's whole point) never load it at all. */
export default function AuraBackgroundAnimator() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      gsap.to(".arena-aura-1", { xPercent: x * 8, yPercent: y * 8, duration: 1.6, ease: "power2.out", overwrite: "auto" });
      gsap.to(".arena-aura-2", { xPercent: -x * 6, yPercent: -y * 6, duration: 1.9, ease: "power2.out", overwrite: "auto" });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return null;
}
