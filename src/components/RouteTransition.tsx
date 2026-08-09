"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./RouteTransitionAnimator"), { ssr: false });

/** A thin top progress bar that sweeps on every route change — Next.js App Router has no
 *  built-in transition event, so this keys off pathname changes directly.
 *
 *  MOBILE-PERF-BASELINE.md re-measurement: an inline `import("gsap")` inside this component's
 *  own useEffect was NOT enough to keep gsap out of every route's initial script list — this
 *  component itself is always mounted (root layout), so Turbopack's build-time chunk graph
 *  still treated the dynamically-imported module as reachable-on-load and emitted it as an
 *  eager `async` script anyway, same as before. The fix that actually worked (proven by
 *  PersistentOrb's ~876KB three.js chunk genuinely disappearing from /feed's initial load) is a
 *  real `next/dynamic(..., { ssr: false })` boundary around the gsap-consuming code itself,
 *  rendered only once a transition needs to run — which is what RouteTransitionAnimator is. */
export function RouteTransition() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
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
    <>
      <div
        ref={barRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[999] h-[2px] w-full origin-left bg-linear-to-r from-primary-soft to-primary opacity-0"
      />
      {armed && !reduced && <Animator barRef={barRef} trigger={pathname} />}
    </>
  );
}
