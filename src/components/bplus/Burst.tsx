"use client";

import { useMemo } from "react";
import { m, useReducedMotion } from "motion/react";
import { celebrate } from "@/lib/motion";

const COLORS = ["bg-primary", "bg-success", "bg-info", "bg-warning"] as const;

/** Confetti-lite: ≤24 small particles radiating once from the centre of its parent (which must
 *  be `relative`). Renders nothing under reduced motion — the success state stands on its own. */
export function Burst({ count = 18, radius = 110 }: { count?: number; radius?: number }) {
  const reduced = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: Math.min(count, 24) }, (_, i) => {
        const angle = (i / Math.min(count, 24)) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
        const dist = radius * (0.65 + ((i * 37) % 35) / 100);
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: COLORS[i % COLORS.length], size: i % 3 === 0 ? 7 : 5 };
      }),
    [count, radius],
  );
  if (reduced) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {particles.map((p, i) => (
        <m.span
          key={i}
          className={`absolute rounded-full ${p.color}`}
          style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={celebrate}
        />
      ))}
    </span>
  );
}
