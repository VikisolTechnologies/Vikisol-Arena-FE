"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** A thin top progress bar that sweeps on every route change — Next.js App Router has no
 *  built-in transition event, so this keys off pathname changes directly.
 *
 *  MOBILE-PERF-BASELINE.md: this component (and PageTransition) intentionally no-op on the
 *  very first render — there's nothing to transition from yet — but were still eagerly pulling
 *  in gsap + ScrollTrigger + Draggable + InertiaPlugin (~192KB) via the shared `useGsap()` hook
 *  on every single page's initial load, for a code path guaranteed not to run until a second
 *  navigation happens. gsap core (no plugins - this component only ever calls `.timeline()`/
 *  `.to()`/`.set()`) is now dynamically imported only once an actual transition needs to run,
 *  which by definition is after the page has already painted once. Same visual timeline,
 *  same easing, just loaded lazily instead of eagerly. */
export function RouteTransition() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reduced || !barRef.current) return;
    const bar = barRef.current;
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled || !bar) return;
      gsap
        .timeline()
        .set(bar, { scaleX: 0, opacity: 1 })
        .to(bar, { scaleX: 0.7, duration: 0.35, ease: "power2.out" })
        .to(bar, { scaleX: 1, duration: 0.2, ease: "power1.in" })
        .to(bar, { opacity: 0, duration: 0.25, delay: 0.05 });
    });
    return () => { cancelled = true; };
  }, [pathname, reduced]);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[999] h-[2px] w-full origin-left bg-linear-to-r from-primary-soft to-primary opacity-0"
    />
  );
}
