"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type GraphNode = {
  id: string;
  label: string;
  type: "center" | "skill" | "meta";
  verified?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

/** Small hand-rolled force simulation (spring-to-center + mutual repulsion) — no d3 dependency needed for a graph this size. */
export function ForceGraph({
  nodes: initialNodes,
  selectedId,
  onSelect,
}: {
  nodes: Omit<GraphNode, "x" | "y" | "vx" | "vy">[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const reduced = useReducedMotion();
  const [, forceRender] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    nodesRef.current = initialNodes.map((n, i) => {
      const existing = nodesRef.current.find((p) => p.id === n.id);
      if (existing) return { ...existing, ...n };
      const angle = (i / Math.max(1, initialNodes.length - 1)) * Math.PI * 2;
      const r = n.type === "center" ? 0 : 90 + (i % 3) * 30;
      return { ...n, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: 0, vy: 0 };
    });
  }, [initialNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const d = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * d;
      canvas.height = rect.height * d;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const nodes = nodesRef.current;

      if (!reduced) {
        for (const n of nodes) {
          if (n.type === "center") continue;
          const restLen = 130;
          const dx = n.x - cx;
          const dy = n.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const springForce = (dist - restLen) * 0.02;
          n.vx -= (dx / dist) * springForce;
          n.vy -= (dy / dist) * springForce;

          for (const other of nodes) {
            if (other === n) continue;
            const odx = n.x - other.x;
            const ody = n.y - other.y;
            const odist = Math.sqrt(odx * odx + ody * ody) || 1;
            if (odist < 90) {
              const repel = (90 - odist) * 0.02;
              n.vx += (odx / odist) * repel;
              n.vy += (ody / odist) * repel;
            }
          }
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(d, d);

      const center = nodes.find((n) => n.type === "center");
      if (center) {
        for (const n of nodes) {
          if (n.type === "center") continue;
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(n.x, n.y);
          ctx.strokeStyle = n.id === selectedId ? "rgba(255,138,91,0.5)" : "rgba(255,255,255,0.1)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const radius = n.type === "center" ? 34 : n.id === selectedId ? 26 : 22;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          n.type === "center"
            ? "#FF6B35"
            : n.id === selectedId
              ? "rgba(255,138,91,0.35)"
              : n.verified
                ? "rgba(255,138,91,0.18)"
                : "rgba(255,255,255,0.06)";
        ctx.fill();
        ctx.strokeStyle = n.id === selectedId ? "#FF8A5B" : "rgba(255,255,255,0.15)";
        ctx.lineWidth = n.id === selectedId ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = n.type === "center" ? "#160a05" : "#F5F5F6";
        ctx.font = n.type === "center" ? "600 11px Inter, sans-serif" : "500 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = n.label.length > 12 ? n.label.slice(0, 11) + "…" : n.label;
        ctx.fillText(label, n.x, n.y);
      }
      ctx.restore();

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced, selectedId]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const n of nodesRef.current) {
      const radius = n.type === "center" ? 34 : 24;
      if (Math.hypot(n.x - x, n.y - y) <= radius) {
        onSelect(n.id);
        forceRender((v) => v + 1);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      role="img"
      aria-label="Interactive identity graph — click a node to focus it"
      className="h-[360px] w-full cursor-pointer rounded-2xl"
    />
  );
}
