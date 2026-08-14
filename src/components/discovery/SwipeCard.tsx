"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatINRRange } from "@/lib/format";
import type { Job } from "@/lib/types";

const Animator = dynamic(() => import("./SwipeCardAnimator").then((m) => m.SwipeCardAnimator), { ssr: false });

export type SwipeDirection = "left" | "right" | "up";
export type SwipeCardHandle = { swipe: (direction: SwipeDirection) => void };

export const SwipeCard = forwardRef<SwipeCardHandle, {
  job: Job;
  isTop: boolean;
  stackDepth: number;
  onResolved: (direction: SwipeDirection) => void;
}>(function SwipeCard({ job, isTop, stackDepth, onResolved }, ref) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Populated once SwipeCardAnimator mounts and hands back its real gsap-backed fling. If a
  // swipe is triggered before that (a real but narrow race window - see SwipeCardAnimator.tsx's
  // comment), fall back to resolving immediately without the animation rather than a stuck
  // interaction.
  const flingImplRef = useRef<((direction: SwipeDirection) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    swipe: (direction) => {
      if (flingImplRef.current) flingImplRef.current(direction);
      else onResolved(direction);
    },
  }));

  return (
    <div
      ref={cardRef}
      // ARENA-VISUAL-RICHNESS.md R1/R4 - Discover's hero moment (the swipe deck itself) is also
      // its one deep-contrast element: a deliberately black card on the ivory canvas around it,
      // same pattern as Home's black composer bar. Fixed dark colors here on purpose, not the
      // semantic tokens the rest of the product theme uses - this card opts out of the light
      // cascade the same way the marketing/landing surfaces do, so `--primary`/`--muted-foreground`
      // (remapped to near-black in the product theme) don't go black-on-black here.
      className="absolute inset-0 touch-none select-none overflow-hidden rounded-[var(--radius-card,24px)] border border-white/10 bg-ink p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      style={{
        transform: isTop
          ? undefined
          : `perspective(1000px) translateY(${stackDepth * 14}px) translateZ(${-stackDepth * 38}px) rotateZ(${stackDepth % 2 === 0 ? 1.5 : -1.5}deg)`,
        zIndex: 10 - stackDepth,
        opacity: stackDepth > 2 ? 0 : 1 - stackDepth * 0.12,
        filter: stackDepth > 0 ? `brightness(${1 - stackDepth * 0.12})` : undefined,
      }}
    >
      {/* R2 - a company thumbnail (real logo once one exists; deterministic placeholder photo
          until then, same reasoning as PersonAvatar/FeedItemCard's thumbnails). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder URL, see comment above */}
      <img
        src={`https://picsum.photos/seed/${encodeURIComponent(job.id)}/640/280`}
        alt=""
        className="pointer-events-none absolute inset-x-0 top-0 h-28 w-full object-cover opacity-40"
        loading="lazy"
      />
      <div className="relative flex items-start justify-between gap-3">
        <span className="champagne-ring flex size-12 items-center justify-center rounded-2xl bg-ink-800 text-2xl">{job.companyEmoji}</span>
        <Badge variant="secondary" className="gap-1 bg-champagne text-ink">
          <Sparkles className="size-3" /> {job.matchPercentage}% match
        </Badge>
      </div>
      <h2 className="relative mt-4 font-display text-2xl font-bold tracking-tight">{job.title}</h2>
      <p className="relative text-sm text-white/60">{job.company}</p>
      <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/60">
        <span className="flex items-center gap-1">
          <MapPin className="size-3" /> {job.location}
        </span>
        <span>
          {formatINRRange(job.salaryMin, job.salaryMax, "LPA")}
        </span>
        <Badge variant="secondary" className="bg-white/10 text-white">
          {job.employmentType}
        </Badge>
      </div>
      <p className="relative mt-4 text-sm leading-relaxed text-white/60">{job.description}</p>
      <div className="relative mt-4 flex flex-wrap gap-1.5">
        {job.skills.map((s) => (
          <Badge key={s} variant="secondary" className="bg-white/10 text-[11px] text-white/70">
            {s}
          </Badge>
        ))}
      </div>
      <Animator
        cardRef={cardRef}
        isTop={isTop}
        reduced={reduced}
        onFlingReady={(fn) => {
          flingImplRef.current = fn;
        }}
        onResolved={onResolved}
      />
    </div>
  );
});
