"use client";

import { useEffect, type RefObject } from "react";
import { useGsap, Draggable } from "@/lib/gsap";
import type { SwipeDirection } from "./SwipeCard";

/** SwipeCard's fling/drag/tilt logic, split into its own file for the same next/dynamic
 *  code-split reason as HeroAnimator — the last of the 11 files MOBILE-PERF-BASELINE.md
 *  identified. Unlike the other 10, this one drives an `useImperativeHandle` the parent exposes
 *  to code outside the component (a button click can trigger a swipe before the user ever drags
 *  anything) — so unlike a purely decorative animation, this can't just "not run yet" if the
 *  dynamic chunk hasn't loaded. `onFlingReady` hands the real gsap-backed implementation back up
 *  to the parent's ref once mounted; SwipeCard.tsx falls back to resolving the swipe WITHOUT the
 *  animation (correct outcome, just no flourish) if a swipe is triggered before that happens —
 *  a real but narrow and low-severity race window, not a stuck interaction. */
export function SwipeCardAnimator({
  cardRef,
  isTop,
  reduced,
  onFlingReady,
  onResolved,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  isTop: boolean;
  reduced: boolean;
  onFlingReady: (fn: (direction: SwipeDirection) => void) => void;
  onResolved: (direction: SwipeDirection) => void;
}) {
  const gsap = useGsap();

  const fling = (direction: SwipeDirection) => {
    if (!cardRef.current) {
      onResolved(direction);
      return;
    }
    if (reduced) {
      gsap.to(cardRef.current, { opacity: 0, duration: 0.15, onComplete: () => onResolved(direction) });
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const target =
      direction === "right" ? { x: vw, rotation: 24 } : direction === "left" ? { x: -vw, rotation: -24 } : { y: -vh };
    gsap.to(cardRef.current, { ...target, opacity: 0, duration: 0.45, ease: "power2.in", onComplete: () => onResolved(direction) });
  };

  useEffect(() => {
    onFlingReady(fling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    if (!isTop || reduced || !cardRef.current) return;
    const threshold = 110;
    const [draggable] = Draggable.create(cardRef.current, {
      type: "x,y",
      inertia: true,
      onDrag: function () {
        gsap.set(cardRef.current, { rotation: this.x / 22 });
      },
      onDragEnd: function () {
        if (this.x > threshold) fling("right");
        else if (this.x < -threshold) fling("left");
        else if (this.y < -threshold) fling("up");
        else gsap.to(cardRef.current, { x: 0, y: 0, rotation: 0, duration: 0.4, ease: "back.out(1.6)" });
      },
    });
    return () => {
      draggable.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, reduced]);

  // Real 3D tilt toward the cursor (desktop) or device orientation (mobile).
  useEffect(() => {
    if (!isTop || reduced || !cardRef.current) return;
    const card = cardRef.current;
    gsap.set(card, { transformPerspective: 900 });

    const onMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, { rotateY: px * 14, rotateX: -py * 10, duration: 0.4, ease: "power2.out", overwrite: "auto" });
    };
    const onLeave = () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
    };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const gx = Math.max(-20, Math.min(20, e.gamma));
      const gy = Math.max(-20, Math.min(20, e.beta - 40));
      gsap.to(card, { rotateY: gx * 0.6, rotateX: -gy * 0.4, duration: 0.6, ease: "power2.out", overwrite: "auto" });
    };
    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("deviceorientation", onOrientation);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTop, reduced]);

  return null;
}
