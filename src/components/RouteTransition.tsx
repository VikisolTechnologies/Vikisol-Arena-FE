"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** A thin top progress bar that sweeps on every route change — Next.js App Router has no
 *  built-in transition event, so this keys off pathname changes directly. GSAP-only, no
 *  Framer Motion, consistent with the rest of the app's motion system. */
export function RouteTransition() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);

  useGSAP(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reduced || !barRef.current) return;
    gsap
      .timeline()
      .set(barRef.current, { scaleX: 0, opacity: 1 })
      .to(barRef.current, { scaleX: 0.7, duration: 0.35, ease: "power2.out" })
      .to(barRef.current, { scaleX: 1, duration: 0.2, ease: "power1.in" })
      .to(barRef.current, { opacity: 0, duration: 0.25, delay: 0.05 });
  }, [pathname, reduced]);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[999] h-[2px] w-full origin-left bg-linear-to-r from-primary-soft to-primary opacity-0"
    />
  );
}
