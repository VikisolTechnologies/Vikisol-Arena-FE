"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./PageTransitionAnimator"), { ssr: false });

/**
 * Fades/lifts the new route's content in on every navigation. App Router swaps `children`
 * with no exit transition (the previous tree is already unmounted by the time this runs), so
 * this is necessarily an entrance-only transition — paired with RouteTransition's top progress
 * bar, it's what actually reads as a page change rather than a hard cut.
 *
 * MOBILE-PERF-BASELINE.md re-measurement: same fix as RouteTransition — a real next/dynamic
 * boundary (PageTransitionAnimator), not an inline `import("gsap")`, is what's actually needed
 * to keep gsap off this always-mounted component's — and therefore every route's — initial load.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const isFirstRender = useRef(true);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arms the (already code-split) animator in response to a real navigation, not a render-time computation
    if (!reduced) setArmed(true);
  }, [pathname, reduced]);

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {children}
      {armed && !reduced && <Animator containerRef={containerRef} trigger={pathname} />}
    </div>
  );
}
