"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { breathe } from "@/lib/motion";

/** Jenny is the orange orb — never a human photo (correction #2). It breathes only while the
 *  gateway is reachable; offline it rests, desaturated, so the state is never faked. */
export function JennyOrb({ size = 40, online, still, className }: { size?: number; online: boolean; /** Full colour, no breathing (a list row that doesn't know her status). */ still?: boolean; className?: string }) {
  return (
    <m.span
      aria-hidden
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full", !online && !still && "saturate-[.35]", className)}
      style={{ width: size, height: size }}
      animate={online && !still ? breathe.animate : undefined}
      transition={online && !still ? breathe.transition : undefined}
    >
      <span
        className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,var(--warning),var(--primary)_58%,var(--primary-pressed))]"
        style={{ boxShadow: online ? `0 0 ${size * 0.45}px ${size * 0.08}px color-mix(in oklch, var(--primary) 55%, transparent)` : "none" }}
      />
      <svg viewBox="0 0 40 40" className="relative" style={{ width: size * 0.5, height: size * 0.5 }} fill="none">
        <path d="M9 22c1.6-2.6 4.4-2.6 6 0M25 22c1.6-2.6 4.4-2.6 6 0" stroke="rgba(30,23,20,.72)" strokeWidth={2.6} strokeLinecap="round" />
      </svg>
    </m.span>
  );
}
