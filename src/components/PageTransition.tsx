"use client";

import { useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Fades/lifts the new route's content in on every navigation. App Router swaps `children`
 * with no exit transition (the previous tree is already unmounted by the time this runs), so
 * this is necessarily an entrance-only transition — paired with RouteTransition's top progress
 * bar, it's what actually reads as a page change rather than a hard cut.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);

  useGSAP(
    () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      if (reduced || !containerRef.current) return;
      gsap.fromTo(containerRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    },
    { dependencies: [pathname, reduced] },
  );

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
