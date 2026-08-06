"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";

const HealthOrbScene = dynamic(() => import("./HealthOrbScene").then((m) => m.HealthOrbScene), { ssr: false });

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Career Health stat, rendered as a glowing 3D-shaded orb inside a progress ring —
 * replaces the plain icon+number StatCard for this one metric. */
export function CareerHealthGauge({ value }: { value: number }) {
  const reduced = useReducedMotion();
  // ARENA-PERFORMANCE.md non-negotiable: the 3D stays everywhere, desktop and mobile - mobile
  // gets the same scene at a cheaper quality tier (see HealthOrbScene's `quality` prop), not a
  // permanent static swap. prefers-reduced-motion is the only accessibility-driven fallback.
  const isMobile = useIsMobileViewport();
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * CIRCUMFERENCE;

  return (
    <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
      <div className="relative flex size-14 items-center justify-center">
        <div className="absolute inset-[3px] overflow-hidden rounded-full">
          {reduced ? (
            <div
              className="size-full rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 30%, #FF8A5B, #FF6B35 70%)",
                opacity: 0.4 + pct / 200,
              }}
            />
          ) : (
            <HealthOrbScene value={pct} quality={isMobile ? "lite" : "full"} />
          )}
        </div>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" aria-hidden>
          <circle cx="28" cy="28" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle
            cx="28"
            cy="28"
            r={RADIUS}
            fill="none"
            stroke="#FF8A5B"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            style={{ filter: "drop-shadow(0 0 4px rgba(255,138,91,0.7))" }}
          />
        </svg>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{pct}%</p>
      <p className="text-xs text-muted-foreground">Career Health</p>
    </div>
  );
}
