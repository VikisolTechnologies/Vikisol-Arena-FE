import { Fraunces, Instrument_Serif, Newsreader } from "next/font/google";

// ARENA-PHASE-1-BUILD.md §1 - the display typeface isn't chosen yet. Loaded here, scoped to
// this one route (not root layout.tsx), so the checkpoint comparison costs nothing on every
// other page's bundle while it's undecided. Three genuinely different flavours to choose
// between by eye, not just three Google Fonts entries: Fraunces (warm, soft-contrast, a little
// quirky - has real optical-size personality at display sizes), Instrument Serif (thin,
// transitional, elegant - reads more editorial-fashion), Newsreader (classic literary/serif,
// closer to a newspaper display face) - deliberately spread across the range rather than three
// near-identical serifs.
export const fraunces = Fraunces({
  variable: "--font-arena-fraunces",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
});

export const instrumentSerif = Instrument_Serif({
  variable: "--font-arena-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
});

export const newsreader = Newsreader({
  variable: "--font-arena-newsreader",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal"],
  display: "swap",
});

export type DisplayFontChoice = "fraunces" | "instrument" | "newsreader";

export const DISPLAY_FONT_VAR: Record<DisplayFontChoice, string> = {
  fraunces: "var(--font-arena-fraunces)",
  instrument: "var(--font-arena-instrument)",
  newsreader: "var(--font-arena-newsreader)",
};

export function resolveDisplayFont(raw: string | undefined): DisplayFontChoice {
  if (raw === "instrument" || raw === "newsreader") return raw;
  return "fraunces";
}
