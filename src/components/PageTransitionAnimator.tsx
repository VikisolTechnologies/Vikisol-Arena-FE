"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/** The actual gsap entrance tween for PageTransition, split into its own file for the same
 *  genuine-code-split reason as RouteTransitionAnimator — only loaded once a real transition
 *  needs to play, never part of any route's initial bundle. */
export function PageTransitionAnimator({
  containerRef,
  trigger,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  trigger: string;
}) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // ARENA-PERF-AND-MOBILE-FIX.md Track A - GSAP's `y` tween applies a `transform`, and even at
    // the resting `y: 0` state it leaves that transform set inline (an identity matrix, not
    // `none`) rather than clearing it. Per the CSS spec, ANY transform on an ancestor - even a
    // no-op one - creates a new containing block for `position: fixed` descendants. This
    // container wraps the entire authenticated app (every AppShell instance, and everything it
    // renders - the mobile nav bar, the persistent Agent orb), so after the FIRST client-side
    // route change, every "fixed" element in the app silently stopped being fixed to the
    // viewport and instead anchored to this container's full scrollable height - on a long feed
    // page, the nav bar and orb ended up thousands of pixels below the visible screen. Only a
    // hard page reload (no client-side nav yet) looked correct, which is exactly why this stayed
    // invisible to on-load screenshots. `clearProps: "transform"` makes gsap remove the inline
    // transform once the tween finishes, restoring `transform: none` and fixing the containing
    // block for every consumer at once - not a targeted patch on each affected component.
    gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", clearProps: "transform" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return null;
}
