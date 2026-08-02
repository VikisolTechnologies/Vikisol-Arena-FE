"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Star = { x: number; y: number; r: number; o: number; vx: number; vy: number; orange: boolean; cluster: number };

function hashSeed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clusterCount(resultCount: number) {
  return Math.min(6, Math.max(2, Math.ceil(resultCount / 4) || 3));
}

/**
 * Canvas particle field behind the Talent Universe section — ports arena-prototype.html's
 * #stars, plus an optional live-search mode: when `active`, stars drift toward a handful of
 * deterministic cluster centers (reseeded from the query text + result count) instead of
 * free-roaming, so the field visibly re-clusters as you type. Reverts to ambient scatter when
 * inactive. Cluster *targets* are recomputed on prop change; star positions just ease toward
 * them frame over frame, so nothing teleports.
 */
export function Starfield({ active = false, resultCount = 0, seed = "" }: { active?: boolean; resultCount?: number; seed?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const stateRef = useRef({ active, resultCount, seed });
  const sizeRef = useRef({ w: 0, h: 0 });
  const clustersRef = useRef<{ x: number; y: number }[]>([]);

  // Keeps the draw loop's ref read up to date without touching refs during render itself.
  useEffect(() => {
    stateRef.current = { active, resultCount, seed };
  }, [active, resultCount, seed]);

  const recomputeClusters = (w: number, h: number, rc: number, sd: string) => {
    if (!w || !h) return;
    const n = clusterCount(rc);
    const rand = mulberry32(hashSeed(sd || "arena"));
    clustersRef.current = Array.from({ length: n }, () => ({
      x: w * (0.18 + rand() * 0.64),
      y: h * (0.18 + rand() * 0.64),
    }));
  };

  // Query/result changes only move the targets — the running animation loop below eases
  // stars toward whatever clustersRef currently holds.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    recomputeClusters(w, h, resultCount, seed);
  }, [seed, resultCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let stars: Star[] = [];
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 2);
      const w = (canvas.width = rect.width * d);
      const h = (canvas.height = rect.height * d);
      sizeRef.current = { w, h };
      const n = window.innerWidth < 700 ? 70 : 130;
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: (Math.random() * 1.6 + 0.5) * d,
        o: Math.random() * 0.7 + 0.25,
        vx: (Math.random() - 0.5) * 0.12 * d,
        vy: (Math.random() - 0.5) * 0.12 * d,
        orange: Math.random() < 0.3,
        cluster: Math.floor(Math.random() * 6),
      }));
      recomputeClusters(w, h, stateRef.current.resultCount, stateRef.current.seed);
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);
      const clusters = clustersRef.current;
      const isActive = stateRef.current.active && clusters.length > 0;
      const linkDist = isActive ? 16000 : 9000;

      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        if (!reduced) {
          if (isActive) {
            const c = clusters[a.cluster % clusters.length];
            a.vx += (c.x - a.x) * 0.0009;
            a.vy += (c.y - a.y) * 0.0009;
            a.vx *= 0.92;
            a.vy *= 0.92;
          } else {
            if (a.x < 0 || a.x > w) a.vx *= -1;
            if (a.y < 0 || a.y > h) a.vy *= -1;
          }
          a.x += a.vx;
          a.y += a.vy;
        }
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < linkDist * (window.devicePixelRatio || 1)) {
            ctx.strokeStyle = `rgba(255,138,91,${(1 - d2 / linkDist) * (isActive ? 0.18 : 0.12)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = a.orange ? `rgba(255,107,53,${a.o})` : `rgba(255,255,255,${a.o})`;
        ctx.fill();
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
