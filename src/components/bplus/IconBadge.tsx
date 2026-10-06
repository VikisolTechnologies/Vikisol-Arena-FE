import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";

/** Board colours for icon badges (onboarding tiles, Create sheet, next steps, settings rows). */
const TONES = {
  orange: "bg-[#ff5a1f] text-white",
  red: "bg-[#e5484d] text-white",
  green: "bg-[#2f9e5b] text-white",
  blue: "bg-[#3b82f6] text-white",
  brown: "bg-[#8b4a2b] text-white",
  slate: "bg-[#5e7294] text-white",
  amber: "bg-[#f2a93b] text-[#1e1714]",
  ink: "bg-[#1e1714] text-white",
  jenny: "bg-[radial-gradient(circle_at_35%_30%,#ffb46b,#ff5a1f_60%,#e24a12)] text-white",
} as const;
export type IconBadgeTone = keyof typeof TONES;

/** A solid white glyph in a saturated circle — the boards' icon style (review A5). 44px default. */
export function IconBadge({ icon: Glyph, tone, size = 44, className }: { icon: ComponentType<SVGProps<SVGSVGElement>>; tone: IconBadgeTone; size?: number; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full", TONES[tone], className)} style={{ width: size, height: size }}>
      <Glyph width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} />
    </span>
  );
}
