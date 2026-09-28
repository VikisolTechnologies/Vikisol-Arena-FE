import type { SVGProps } from "react";

/** Sport glyphs lucide doesn't have, drawn on the same 24px grid and stroke style so they sit
 *  beside lucide icons in tiles and covers. Decorative. */
type GlyphProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { strokeWidth?: number; color?: string };

function Glyph({ children, strokeWidth = 1.75, color = "currentColor", ...rest }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

export function CricketGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M6.6 15.2 15.4 6.4a1.8 1.8 0 0 1 2.5 0l.3.3a1.8 1.8 0 0 1 0 2.5l-8.8 8.8z" />
      <path d="M6.6 15.2 4 17.8M9.4 18l-1.2 1.2M4 17.8l2.2 2.2" />
      <circle cx="18" cy="17.5" r="2.4" />
      <path d="M16.3 15.8a3.4 3.4 0 0 1 3.4 3.4" />
    </Glyph>
  );
}

export function ShuttleGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path d="M9.6 16.8a2.6 2.6 0 1 0 4.8 0" />
      <path d="M9.6 16.8 6.6 5.2M14.4 16.8l3-11.6M12 16.4V4.6" />
      <path d="M6.6 5.2Q12 3 17.4 5.2M7.6 9.2q4.4-1.5 8.8 0M8.6 13q3.4-1.2 6.8 0" />
    </Glyph>
  );
}

export function TennisGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M4.6 7.8c3.6 1.2 5.2 4.6 3.9 9.9M19.4 16.2c-3.6-1.2-5.2-4.6-3.9-9.9" />
    </Glyph>
  );
}

export function BasketballGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M3.5 12h17M6 6c2.8 2.4 2.8 9.6 0 12M18 6c-2.8 2.4-2.8 9.6 0 12" />
    </Glyph>
  );
}

export function PaddleGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="10" cy="10" r="6" />
      <path d="m14.3 14.3 4.6 4.6a1 1 0 0 1 0 1.4l-.2.2a1 1 0 0 1-1.4 0l-4.6-4.6" />
      <circle cx="19" cy="5" r="1.6" />
    </Glyph>
  );
}

export function PickleballGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="4" y="3.5" width="10" height="12" rx="4.5" />
      <path d="M9 15.5V20" />
      <circle cx="18" cy="16.5" r="3" />
      <path d="M17 15.6h.01M19 16.4h.01M17.6 17.8h.01" />
    </Glyph>
  );
}

export function FootballGlyph(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 8.2 3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
      <path d="M12 8.2V3.6M15.2 10.5l4.3-1.4M14 14.3l2.7 3.6M10 14.3l-2.7 3.6M8.8 10.5 4.5 9.1" />
    </Glyph>
  );
}
