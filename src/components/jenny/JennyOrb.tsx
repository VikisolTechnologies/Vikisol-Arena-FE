"use client";

import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { breathe } from "@/lib/motion";

/** Sparks around the large orb (board: a few warm points of light). Fractions of the orb size. */
const SPARKS = [
  { x: -0.3, y: 0.12, s: 0.04 },
  { x: 1.3, y: 0.05, s: 0.05 },
  { x: 1.18, y: 0.78, s: 0.035 },
  { x: -0.3, y: 0.9, s: 0.04 },
  { x: 1.02, y: 1.02, s: 0.03 },
];

/** Jenny is a glowing orange sun — never a human photo (correction #2). Always full colour (the
 *  board's sun); it breathes and its sparks twinkle only while the gateway is reachable, so life
 *  is never faked. Offline it rests with a dimmer halo. */
export function JennyOrb({ size = 40, online, still, className }: { size?: number; online: boolean; /** No breathing (a list row that doesn't know her status). */ still?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const alive = online && !still && !reduce;
  const big = size >= 96;
  return (
    <m.span
      aria-hidden
      className={cn("relative inline-grid shrink-0 place-items-center rounded-full", className)}
      style={{ width: size, height: size }}
      animate={alive ? breathe.animate : undefined}
      transition={alive ? breathe.transition : undefined}
    >
      {/* Soft halo */}
      <span
        className="pointer-events-none absolute rounded-full"
        style={{
          inset: -size * (big ? 0.45 : 0.3),
          background: `radial-gradient(circle, rgba(255,140,60,${online || still ? 0.42 : 0.26}) 0%, rgba(255,110,40,0.12) 45%, transparent 70%)`,
        }}
      />
      {/* The sun: deep orange core, bright warm rim */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 58%, #e2431a 0%, #ff6528 42%, #ff9a45 74%, #ffc57a 94%, #ffe0a8 100%)",
          boxShadow: `inset 0 0 ${size * 0.1}px ${size * 0.02}px rgba(255,226,170,0.75), 0 0 ${size * 0.35}px ${size * 0.06}px rgba(255,120,50,0.5)`,
        }}
      />
      {/* Smiling eyes */}
      <svg viewBox="0 0 40 40" className="relative" style={{ width: size * 0.5, height: size * 0.5 }} fill="none">
        <path d="M9 23c1.6-3 4.4-3 6 0M25 23c1.6-3 4.4-3 6 0" stroke="rgba(255,240,220,.95)" strokeWidth={2.6} strokeLinecap="round" />
      </svg>
      {big &&
        SPARKS.map((p, i) => (
          <m.span
            key={i}
            className="pointer-events-none absolute rounded-full bg-[#ffb36b]"
            style={{ left: p.x * size, top: p.y * size, width: p.s * size, height: p.s * size, boxShadow: `0 0 ${size * 0.06}px ${size * 0.02}px rgba(255,150,70,.8)` }}
            animate={alive ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.6 }}
            transition={alive ? { duration: 2.6 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } : undefined}
          />
        ))}
    </m.span>
  );
}
