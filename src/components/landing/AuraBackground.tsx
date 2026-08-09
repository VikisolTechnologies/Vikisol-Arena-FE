"use client";

import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** The two fixed, blurred gradient blobs behind the app (arena-prototype.html .aura) — drift
 * gently toward the cursor for a subtle sense of depth behind the glass surfaces on top.
 *
 * MOBILE-PERF-BASELINE.md: this is mounted unconditionally on every candidate/enterprise page
 * (via CandidateAppShell/EnterpriseAppShell) plus the landing page, so its old `useGsap()` call
 * put the full gsap + ScrollTrigger + Draggable + InertiaPlugin bundle (~192KB) on every
 * route's critical path for two `gsap.to()` calls that need none of those three plugins - and
 * for an effect (`mousemove`-driven cursor parallax) that touch devices essentially never fire
 * at all. gsap core is now dynamically imported only on the first real `mousemove` event, so a
 * mobile visitor - this investigation's whole point - never triggers the import in the first
 * place, and desktop visitors get the exact same easing/duration, just loaded lazily. */
export function AuraBackground() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let gsapCore: typeof import("gsap")["gsap"] | null = null;
    let cancelled = false;

    const animate = (gsap: typeof import("gsap")["gsap"], x: number, y: number) => {
      gsap.to(".arena-aura-1", { xPercent: x * 8, yPercent: y * 8, duration: 1.6, ease: "power2.out", overwrite: "auto" });
      gsap.to(".arena-aura-2", { xPercent: -x * 6, yPercent: -y * 6, duration: 1.9, ease: "power2.out", overwrite: "auto" });
    };

    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (gsapCore) {
        animate(gsapCore, x, y);
        return;
      }
      import("gsap").then(({ gsap }) => {
        if (cancelled) return;
        gsapCore = gsap;
        animate(gsap, x, y);
      });
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      cancelled = true;
      window.removeEventListener("mousemove", onMove);
    };
  }, [reduced]);

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
    </div>
  );
}
