"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./AuraBackgroundAnimator").then((m) => m.AuraBackgroundAnimator), { ssr: false });

/** The two fixed, blurred gradient blobs behind the app (arena-prototype.html .aura) — drift
 * gently toward the cursor for a subtle sense of depth behind the glass surfaces on top.
 *
 * MOBILE-PERF-BASELINE.md re-measurement: this is mounted unconditionally on every candidate/
 * enterprise page (via CandidateAppShell/EnterpriseAppShell) plus the landing page, so — like
 * RouteTransition/PageTransition — an inline `import("gsap")` inside its own useEffect still
 * got emitted as an eager `async` script on every route, because the component itself is always
 * in the root's static render tree. The fix is the same real next/dynamic boundary
 * (AuraBackgroundAnimator), mounted only after the first genuine mousemove — so a touch visitor
 * (this investigation's whole point) never triggers the import, or the eager-script listing,
 * at all. Desktop visitors get the exact same easing/duration, just genuinely loaded lazily. */
export function AuraBackground() {
  const reduced = useReducedMotion();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (reduced || armed) return;
    const onMove = () => setArmed(true);
    window.addEventListener("mousemove", onMove, { once: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduced, armed]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="arena-aura-1 absolute -right-[18vw] -top-[8vw] size-[60vw] max-h-[760px] max-w-[760px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,107,53,0.20), transparent 65%)",
        }}
      />
      <div
        className="arena-aura-2 absolute left-[-20vw] top-[60vh] size-[50vw] max-h-[640px] max-w-[640px] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,138,91,0.10), transparent 65%)",
        }}
      />
      {armed && <Animator />}
    </div>
  );
}
