"use client";

import { useEffect, useRef } from "react";
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

const ZOOM_SCALE = 1.45;
const EASE = 0.09;
const DRAG_CLICK_THRESHOLD = 5; // px moved — below this, a pointerup is treated as a click

/** Hand-rolled force simulation (spring-to-center + mutual repulsion) — no d3 dependency
 * needed for a graph this size. Adds drag-to-reposition, an eased focus-zoom on the
 * selected node, and additive cluster-glow halos (brighter where nodes sit close together,
 * tinted by verified status) on top of the original spring/link/node rendering. */
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
  const viewRef = useRef({ scale: 1, fx: 0, fy: 0 });
  const dragRef = useRef<{ id: string; lastX: number; lastY: number; moved: boolean } | null>(null);

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

  // World-space coords under the current pan/zoom, from a canvas-local pointer position.
  const toWorld = (localX: number, localY: number, w: number, h: number) => {
    const { scale, fx, fy } = viewRef.current;
    return { x: (localX - w / 2) / scale + fx, y: (localY - h / 2) / scale + fy };
  };

  const hitTest = (worldX: number, worldY: number) => {
    for (const n of nodesRef.current) {
      const radius = n.type === "center" ? 34 : 24;
      if (Math.hypot(n.x - worldX, n.y - worldY) <= radius) return n;
    }
    return null;
  };

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
      const draggedId = dragRef.current?.id;

      if (!reduced) {
        for (const n of nodes) {
          if (n.type === "center" || n.id === draggedId) continue;
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

      // Eased focus-zoom: center + scale up on the selected node, ease back to the
      // whole-graph view when nothing's selected. Reduced-motion snaps instantly.
      const focus = nodes.find((n) => n.id === selectedId);
      const targetScale = focus ? ZOOM_SCALE : 1;
      const targetFx = focus ? focus.x : cx;
      const targetFy = focus ? focus.y : cy;
      const view = viewRef.current;
      if (reduced) {
        view.scale = targetScale;
        view.fx = targetFx;
        view.fy = targetFy;
      } else {
        view.scale += (targetScale - view.scale) * EASE;
        view.fx += (targetFx - view.fx) * EASE;
        view.fy += (targetFy - view.fy) * EASE;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(d, d);
      ctx.translate(cx, cy);
      ctx.scale(view.scale, view.scale);
      ctx.translate(-view.fx, -view.fy);

      // Cluster glow — soft additive halos, brighter wherever nodes sit close together.
      ctx.globalCompositeOperation = "lighter";
      for (const n of nodes) {
        const glowColor = n.type === "center" ? "255,107,53" : n.verified ? "52,211,153" : "255,138,91";
        const glowR = n.type === "center" ? 60 : 42;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
        grad.addColorStop(0, `rgba(${glowColor},0.16)`);
        grad.addColorStop(1, `rgba(${glowColor},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

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

  const localPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y, w, h } = localPoint(e);
    const world = toWorld(x, y, w, h);
    const hit = hitTest(world.x, world.y);
    if (!hit) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { id: hit.id, lastX: world.x, lastY: world.y, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y, w, h } = localPoint(e);
    const world = toWorld(x, y, w, h);
    const node = nodesRef.current.find((n) => n.id === drag.id);
    if (!node || node.type === "center") return;
    const dx = world.x - drag.lastX;
    const dy = world.y - drag.lastY;
    if (Math.hypot(dx, dy) > DRAG_CLICK_THRESHOLD / (viewRef.current.scale || 1)) drag.moved = true;
    node.x = world.x;
    node.y = world.y;
    node.vx = dx;
    node.vy = dy;
    drag.lastX = world.x;
    drag.lastY = world.y;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    if (!drag) return;
    if (!drag.moved) onSelect(drag.id); // treat as a click — no real drag happened
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="img"
      aria-label="Interactive identity graph — drag nodes to reposition, click a node to focus and zoom"
      className="h-[360px] w-full cursor-grab touch-none rounded-2xl active:cursor-grabbing"
    />
  );
}
