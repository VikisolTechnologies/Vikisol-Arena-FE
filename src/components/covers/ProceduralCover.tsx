"use client";

import { forwardRef, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { coverParams, type TimeOfDay } from "@/lib/covers/procedural";
import { CATEGORIES, findSubtype, type Category, type Icon } from "@/lib/activities/taxonomy";

const W = 1280;
/** Trig can differ in the last digit between server and browser: round every computed coordinate. */
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const r1 = (n: number) => Math.round(n * 10) / 10;
const H = 720;

/** Mix two hex colours (t = 0 → a, 1 → b). */
function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** A soft, seeded horizon line across the frame (hills / tree line / skyline haze). */
function horizonPath(h: { y: number; amp: number; phase: number; freq: number }) {
  const pts = Array.from({ length: 17 }, (_, i) => {
    const x = (i / 16) * W;
    const t = (i / 16) * Math.PI * 2 * h.freq + h.phase;
    const y = H * (h.y + h.amp * Math.sin(t) + h.amp * 0.45 * Math.sin(t * 2.3 + 1.1));
    return [r1(x), r1(y)] as const;
  });
  let d = `M-40 ${H + 40} L-40 ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` Q${x0} ${y0} ${r1((x0 + x1) / 2)} ${r1((y0 + y1) / 2)}`;
  }
  return `${d} L${W + 40} ${pts[pts.length - 1][1]} L${W + 40} ${H + 40} Z`;
}

export interface CoverProps {
  seed: string;
  category?: Category;
  subtypeId?: string;
  time?: TimeOfDay;
  className?: string;
  /** Plain colour card (host's choice) — gradient only. */
  plain?: boolean;
}

/**
 * A unique, free cover for any activity/project/community (flow §5), photographic in feel rather
 * than clip-art: a deep sky-like gradient in the category colour, one soft light source, 2–3
 * blurred horizon layers for depth, film grain and a vignette — with a small category glyph in
 * the top-right corner and the lower third left calm for the title. Decorative: aria-hidden.
 */
export const ProceduralCover = forwardRef<SVGSVGElement, CoverProps>(function ProceduralCover({ seed, category, subtypeId, time = "day", className, plain }, ref) {
  const uid = useId().replace(/:/g, "");
  const sub = findSubtype(subtypeId);
  const cat = category ?? sub?.category ?? CATEGORIES[CATEGORIES.length - 1];
  const IconCmp: Icon = sub?.icon ?? cat.icon;
  const p = useMemo(() => coverParams(seed, time), [seed, time]);
  const [dark, light] = cat.palette;
  const night = time === "night";
  const sky = mix(light, p.glow.color, night ? 0.08 : 0.5);
  const mid = mix(dark, light, 0.45 + p.shift);
  const ground = mix(dark, "#0b0806", 0.55);
  const rad = (p.angle * Math.PI) / 180;
  const x1 = r4(0.5 - Math.cos(rad) / 2);
  const y1 = r4(0.5 - Math.sin(rad) / 2);
  const glyph = r1(H * 0.085);
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block size-full", className)}>
      <defs>
        <linearGradient id={`g${uid}`} x1={x1} y1={y1} x2={r4(1 - x1)} y2={r4(1 - y1)}>
          <stop offset="0" stopColor={mix(dark, night ? "#070a24" : "#0a0d1a", 0.45)} />
          <stop offset="0.44" stopColor={sky} />
          <stop offset="0.64" stopColor={mid} />
          <stop offset="1" stopColor={ground} />
        </linearGradient>
        <radialGradient id={`s${uid}`} cx={r4(p.glow.x)} cy={r4(p.glow.y)} r={r4(p.glow.r)}>
          <stop offset="0" stopColor="#ffffff" stopOpacity={night ? 0.35 : 0.85} />
          <stop offset="0.12" stopColor={p.glow.color} stopOpacity={night ? 0.35 : 0.7} />
          <stop offset="1" stopColor={p.glow.color} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`w${uid}`} cx={r4(p.glow.x)} cy={r4(p.glow.y + 0.1)} r="0.8">
          <stop offset="0" stopColor={p.glow.color} stopOpacity={night ? 0.12 : 0.38} />
          <stop offset="1" stopColor={p.glow.color} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`v${uid}`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.45} />
        </radialGradient>
        {p.horizons.map((h, i) => (
          <filter key={i} id={`b${uid}${i}`} x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation={h.blur} />
          </filter>
        ))}
        <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={Math.round(p.angle)} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.13" /></feComponentTransfer>
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#g${uid})`} />
      {!plain && (
        <>
          <rect width={W} height={H} fill={`url(#w${uid})`} />
          <rect width={W} height={H} fill={`url(#s${uid})`} />
          {p.horizons.map((h, i) => (
            <path
              key={i}
              d={horizonPath(h)}
              fill={mix(mid, ground, 0.35 + i * 0.3)}
              opacity={r4(0.55 + i * 0.2)}
              filter={`url(#b${uid}${i})`}
            />
          ))}
          <g opacity={0.82}>
            <circle cx={r1(W - glyph * 1.6)} cy={r1(glyph * 1.6)} r={r1(glyph * 0.95)} fill="#000" opacity={0.22} />
            <IconCmp x={r1(W - glyph * 2.1)} y={r1(glyph * 1.1)} width={glyph} height={glyph} strokeWidth={1.6} color="#ffffff" />
          </g>
        </>
      )}
      <rect width={W} height={H} fill={`url(#v${uid})`} />
      <rect width={W} height={H} filter={`url(#n${uid})`} />
    </svg>
  );
});

/** Rasterise a rendered cover to WebP (1280×720) so the chosen card can be stored like a photo. */
export async function coverToBlob(svg: SVGSVGElement): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Cover didn't render"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Cover didn't encode"))), "image/webp", 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The rendered cover as a File named for what the browser actually encoded (Safari gives PNG). */
export async function coverFile(svg: SVGSVGElement): Promise<File> {
  const blob = await coverToBlob(svg);
  return new File([blob], blob.type === "image/webp" ? "cover.webp" : "cover.png", { type: blob.type || "image/png" });
}
