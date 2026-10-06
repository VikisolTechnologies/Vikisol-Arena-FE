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

export interface CoverParams {
  /** Gradient direction in degrees (mostly top→bottom, like a sky). */
  angle: number;
  /** The soft light source ("sun"): position, radius, colour. */
  glow: { x: number; y: number; r: number; color: string };
  /** 2–3 blurred horizon layers, far → near: y (0–1), roughness, blur. */
  horizons: { y: number; amp: number; phase: number; freq: number; blur: number }[];
  /** Colour temperature shift of the mid tone. */
  shift: number;
}

const GLOW: Record<TimeOfDay, string> = { morning: "#ffd98a", day: "#fff1c9", evening: "#ff8a3d", night: "#9aa6ff" };

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
  const layers = 2 + Math.floor(r() * 2);
  return {
    angle: Math.round(between(70, 110)),
    glow: { x: between(0.18, 0.82), y: between(0.26, 0.46), r: between(0.3, 0.5), color: GLOW[time] },
    horizons: Array.from({ length: layers }, (_, i) => ({
      y: 0.52 + i * between(0.08, 0.13),
      amp: between(0.02, 0.07) * (1 - i * 0.2),
      phase: between(0, Math.PI * 2),
      freq: between(1.2, 3.2),
      blur: [14, 7, 3][i] ?? 3,
    })),
    shift: between(-0.08, 0.08),
  };
}
