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

function PatternLayer({ kind, density, id }: { kind: string; density: number; id: string }) {
  const s = r1(64 / density);
  if (kind === "dots")
    return (
      <>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><circle cx={s / 2} cy={s / 2} r={3} fill="#fff" /></pattern>
        <rect width={W} height={H} fill={`url(#${id})`} opacity={0.12} />
      </>
    );
  if (kind === "stripes")
    return (
      <>
        <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width={s / 5} height={s} fill="#fff" /></pattern>
        <rect width={W} height={H} fill={`url(#${id})`} opacity={0.07} />
      </>
    );
  if (kind === "rings")
    return (
      <g fill="none" stroke="#fff" strokeWidth={2} opacity={0.1}>
        {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={W * 0.2} cy={H * 1.05} r={r1((i + 1) * 90 * density)} />)}
      </g>
    );
  if (kind === "waves")
    return (
      <g fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.1}>
        {Array.from({ length: 10 }, (_, i) => {
          const y = r1(H * 0.45 + i * 32 * density);
          return <path key={i} d={`M0 ${y} C ${W * 0.25} ${y - 50} ${W * 0.5} ${y + 50} ${W * 0.75} ${y} S ${W} ${y - 40} ${W + 40} ${y}`} />;
        })}
      </g>
    );
  // contours: nested organic loops, like a topographic map
  return (
    <g fill="none" stroke="#fff" strokeWidth={2} opacity={0.09}>
      {Array.from({ length: 8 }, (_, i) => {
        const k = r1((i + 1) * 70 * density);
        return <ellipse key={i} cx={W * 0.72} cy={H * 0.62} rx={r1(k * 1.3)} ry={r1(k * 0.8)} transform={`rotate(${-12 + i * 3} ${W * 0.72} ${H * 0.62})`} />;
      })}
    </g>
  );
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

/** A unique, free cover for any activity/project/community (flow §5). Decorative: aria-hidden. */
export const ProceduralCover = forwardRef<SVGSVGElement, CoverProps>(function ProceduralCover({ seed, category, subtypeId, time = "day", className, plain }, ref) {
  const uid = useId().replace(/:/g, "");
  const sub = findSubtype(subtypeId);
  const cat = category ?? sub?.category ?? CATEGORIES[CATEGORIES.length - 1];
  const IconCmp: Icon = sub?.icon ?? cat.icon;
  const p = useMemo(() => coverParams(seed, time), [seed, time]);
  const [dark, light] = cat.palette;
  const mid = mix(dark, light, 0.5 + p.shift);
  const rad = (p.angle * Math.PI) / 180;
  const x1 = r4(0.5 - Math.cos(rad) / 2);
  const y1 = r4(0.5 - Math.sin(rad) / 2);
  const size = r1(H * p.icon.size);
  const ix = r1(p.icon.x * W);
  const iy = r1(p.icon.y * H);
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block size-full", className)}>
      <defs>
        <linearGradient id={`g${uid}`} x1={x1} y1={y1} x2={r4(1 - x1)} y2={r4(1 - y1)}>
          <stop offset="0" stopColor={dark} />
          <stop offset="0.6" stopColor={mid} />
          <stop offset="1" stopColor={light} />
        </linearGradient>
        <radialGradient id={`s${uid}`} cx={r4(p.glow.x)} cy={r4(p.glow.y)} r={r4(p.glow.r)}>
          <stop offset="0" stopColor={p.glow.color} stopOpacity={0.75} />
          <stop offset="1" stopColor={p.glow.color} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`v${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.35} />
        </linearGradient>
        <filter id={`n${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={Math.round(p.angle)} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer><feFuncA type="linear" slope="0.08" /></feComponentTransfer>
        </filter>
      </defs>
      <rect width={W} height={H} fill={`url(#g${uid})`} />
      {!plain && (
        <>
          <rect width={W} height={H} fill={`url(#s${uid})`} />
          <PatternLayer kind={p.pattern} density={p.density} id={`p${uid}`} />
          {p.bokeh.map((b, i) => <circle key={i} cx={r1(b.x * W)} cy={r1(b.y * H)} r={r1(b.r * H)} fill="#fff" opacity={r4(b.o)} />)}
          <g transform={`rotate(${r1(p.icon.rotate)} ${r1(ix + size / 2)} ${r1(iy + size / 2)})`}>
            <IconCmp x={ix} y={iy} width={size} height={size} strokeWidth={1.1} color="#ffffff" opacity={0.9} />
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
