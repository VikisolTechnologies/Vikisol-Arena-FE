"use client";

import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Background particle nebula that grows a glowing dot per selected skill (mulberry32-free — pure Math.random is fine here, purely decorative). */
export function SkillNebula({ count }: { count: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const gsap = useGsap();

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

  useGSAP(
    () => {
      if (reduced || !containerRef.current) return;
      gsap.utils.toArray<HTMLElement>(".arena-nebula-dot").forEach((dot, i) => {
        gsap.to(dot, {
          y: i % 2 ? -14 : 14,
          x: i % 3 ? 8 : -8,
          duration: 3 + (i % 5),
          delay: dots[i]?.delay ?? 0,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      });
    },
    { scope: containerRef, dependencies: [reduced, count] },
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
    </div>
  );
}
