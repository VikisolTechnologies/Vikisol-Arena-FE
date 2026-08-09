"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Fades/lifts the new route's content in on every navigation. App Router swaps `children`
 * with no exit transition (the previous tree is already unmounted by the time this runs), so
 * this is necessarily an entrance-only transition — paired with RouteTransition's top progress
 * bar, it's what actually reads as a page change rather than a hard cut.
 *
 * MOBILE-PERF-BASELINE.md: same lazy-load treatment as RouteTransition, same reasoning - this
 * also no-ops on first render, so gsap core is now only fetched once a real transition needs it.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (reduced || !containerRef.current) return;
    const el = containerRef.current;
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled || !el) return;
      gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    });
    return () => { cancelled = true; };
  }, [pathname, reduced]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
