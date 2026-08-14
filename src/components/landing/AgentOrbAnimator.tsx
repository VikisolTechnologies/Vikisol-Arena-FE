"use client";

import { useEffect, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";

/** AgentOrb's entrance/loop/blink tweens + mousemove parallax, split into its own file for the
 *  same next/dynamic code-split reason as HeroAnimator (see that file's comment). Every tween
 *  here uses gsap's `.from()`/`.to()` forms on elements that are already fully visible in their
 *  natural DOM/CSS state (no CSS class hides them first) — if this chunk loads slowly, the orb
 *  simply renders motionless-but-fully-visible until it arrives, never invisible. Only mounted
 *  when `!reduced` (see AgentOrb.tsx). */
export function AgentOrbAnimator({ wrapRef }: { wrapRef: RefObject<HTMLDivElement | null> }) {
  const gsap = useGsap();

  useGSAP(
    () => {
      if (!wrapRef.current) return;

      gsap.from(wrapRef.current, {
        scale: 0.6,
        opacity: 0,
        duration: 1.2,
        ease: "back.out(1.4)",
        delay: 0.2,
      });
      gsap.to(wrapRef.current, {
        y: -18,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".arena-ring-1", {
        rotate: 344,
        duration: 26,
        repeat: -1,
        ease: "none",
        transformOrigin: "center",
      });
      gsap.to(".arena-ring-2", {
        rotate: -338,
        duration: 34,
        repeat: -1,
        ease: "none",
        transformOrigin: "center",
      });
      gsap.utils.toArray<HTMLElement>(".arena-chip").forEach((c, i) => {
        gsap.to(c, {
          y: i % 2 ? -12 : 12,
          duration: 2.2 + i * 0.4,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      });

      const blink = () => {
        gsap.to(".arena-eye", {
          scaleY: 0.08,
          duration: 0.07,
          yoyo: true,
          repeat: 1,
          transformOrigin: "center",
          onComplete: () => gsap.delayedCall(1.6 + Math.random() * 3, blink),
        });
      };
      gsap.delayedCall(1.8, blink);
    },
    { scope: wrapRef },
  );

  // Mouse-parallax tilt — separate from the loop/entrance animations above since it's
  // event-driven, not a self-running timeline.
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (wrapRef.current) {
        gsap.to(wrapRef.current, { rotateY: x * 10, rotateX: -y * 8, duration: 0.6, overwrite: "auto" });
      }
      gsap.to(".arena-eyes", { x: x * 16, y: y * 10, duration: 0.5 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [gsap, wrapRef]);

  return null;
}
