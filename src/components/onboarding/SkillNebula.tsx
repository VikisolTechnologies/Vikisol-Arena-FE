"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./SkillNebulaAnimator").then((m) => m.SkillNebulaAnimator), { ssr: false });

/** Background particle nebula that grows a glowing dot per selected skill (mulberry32-free — pure Math.random is fine here, purely decorative). */
export function SkillNebula({ count }: { count: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const dots = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: `${(Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 100}%`,
        top: `${(Math.sin(i * 78.233) * 43758.5453 % 1 + 1) % 1 * 100}%`,
        size: 4 + (i % 5) * 2,
        orange: i % 3 === 0,
        delay: (i % 7) * 0.3,
      })),
    [],
  );

  return (
    <div ref={containerRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.slice(0, count).map((dot, i) => (
        <span
          key={i}
          className="arena-nebula-dot absolute rounded-full blur-[1px] transition-opacity duration-700"
          style={{
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            background: dot.orange ? "var(--primary-soft)" : "#fff",
            opacity: dot.orange ? 0.7 : 0.4,
            boxShadow: dot.orange ? "0 0 12px var(--primary)" : "0 0 8px rgba(255,255,255,0.6)",
          }}
        />
      ))}
      {!reduced && <Animator containerRef={containerRef} delays={dots.map((d) => d.delay)} />}
    </div>
  );
}
