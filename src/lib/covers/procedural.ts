/**
 * ARENA-APP-FLOW §5 fallback / default: a procedural cover — generated art in the category colour,
 * seeded so every creation gets its own card, free and instant. No text, no logos, no faces.
 */

export type TimeOfDay = "morning" | "day" | "evening" | "night";

/** 32-bit hash of a string (FNV-1a). */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PATTERNS = ["contours", "dots", "stripes", "waves", "rings"] as const;
export type Pattern = (typeof PATTERNS)[number];

export interface CoverParams {
  angle: number;
  glow: { x: number; y: number; r: number; color: string };
  pattern: Pattern;
  density: number;
  icon: { x: number; y: number; size: number; rotate: number };
  bokeh: { x: number; y: number; r: number; o: number }[];
  shift: number;
}

const GLOW: Record<TimeOfDay, string> = { morning: "#ffd98a", day: "#fff1c9", evening: "#ff8a3d", night: "#7d8ce0" };

export function timeOfDayFor(iso?: string): TimeOfDay {
  if (!iso) return "day";
  // Launch area time (not the viewer's or server's zone) so server and client always agree.
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date(iso)));
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16) return "day";
  if (h >= 16 && h < 20) return "evening";
  return "night";
}

/** Everything about a cover that depends on the seed. Same seed → same cover, always. */
export function coverParams(seed: string, time: TimeOfDay = "day"): CoverParams {
  const r = rng(hashSeed(seed));
  const between = (a: number, b: number) => a + r() * (b - a);
  const leftIcon = r() < 0.35;
  return {
    angle: Math.round(between(0, 360)),
    glow: { x: between(0.12, 0.88), y: between(0.08, 0.45), r: between(0.35, 0.6), color: GLOW[time] },
    pattern: PATTERNS[Math.floor(r() * PATTERNS.length)],
    density: between(0.8, 1.35),
    icon: { x: leftIcon ? between(0.08, 0.2) : between(0.58, 0.72), y: between(0.22, 0.42), size: between(0.42, 0.56), rotate: between(-14, 14) },
    bokeh: Array.from({ length: 4 + Math.floor(r() * 4) }, () => ({ x: between(0, 1), y: between(0, 1), r: between(0.03, 0.12), o: between(0.05, 0.16) })),
    shift: between(-0.08, 0.08),
  };
}
