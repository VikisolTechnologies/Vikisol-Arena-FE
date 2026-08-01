"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGsap, Draggable } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Job } from "@/lib/types";

export type SwipeDirection = "left" | "right" | "up";
export type SwipeCardHandle = { swipe: (direction: SwipeDirection) => void };

export const SwipeCard = forwardRef<SwipeCardHandle, {
  job: Job;
  isTop: boolean;
  stackDepth: number;
  onResolved: (direction: SwipeDirection) => void;
}>(function SwipeCard({ job, isTop, stackDepth, onResolved }, ref) {
  const cardRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();
  const reduced = useReducedMotion();

  const fling = (direction: SwipeDirection) => {
    if (!cardRef.current) return onResolved(direction);
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

  useImperativeHandle(ref, () => ({ swipe: fling }));

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

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 touch-none select-none rounded-[24px] border border-border bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{
        transform: isTop ? undefined : `translateY(${stackDepth * 10}px) scale(${1 - stackDepth * 0.035})`,
        zIndex: 10 - stackDepth,
        opacity: stackDepth > 2 ? 0 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5 text-2xl">{job.companyEmoji}</span>
        <Badge variant="secondary" className="gap-1 bg-primary/12 text-primary-soft">
          <Sparkles className="size-3" /> {job.matchPercentage}% match
        </Badge>
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">{job.title}</h2>
      <p className="text-sm text-muted-foreground">{job.company}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" /> {job.location}
        </span>
        <span>
          ₹{job.salaryMin}–{job.salaryMax} LPA
        </span>
        <Badge variant="secondary" className="bg-white/5">
          {job.employmentType}
        </Badge>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{job.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {job.skills.map((s) => (
          <Badge key={s} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
});
