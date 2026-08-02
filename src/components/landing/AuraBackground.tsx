"use client";

import { useEffect } from "react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** The two fixed, blurred gradient blobs behind the app (arena-prototype.html .aura) — drift
 * gently toward the cursor for a subtle sense of depth behind the glass surfaces on top. */
export function AuraBackground() {
  const reduced = useReducedMotion();
  const gsap = useGsap();

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      gsap.to(".arena-aura-1", { xPercent: x * 8, yPercent: y * 8, duration: 1.6, ease: "power2.out", overwrite: "auto" });
      gsap.to(".arena-aura-2", { xPercent: -x * 6, yPercent: -y * 6, duration: 1.9, ease: "power2.out", overwrite: "auto" });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduced, gsap]);

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
