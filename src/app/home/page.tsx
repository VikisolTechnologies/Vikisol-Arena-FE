import { fraunces, instrumentSerif, newsreader, resolveDisplayFont, DISPLAY_FONT_VAR } from "./fonts";
import { HomeContent } from "@/components/home-v3/HomeContent";

// ARENA-PHASE-1-BUILD.md §1 checkpoint - the display typeface isn't chosen yet. ?font=fraunces
// (default) | instrument | newsreader lets the founder compare all three live, on their own
// phone, at the real deployed URL - not just from a screenshot. Server component so the font
// choice (and the hero's static frame - see HomeContent's own comment) needs zero client JS to
// be correct on first paint; only the three font loaders below run through next/font/google,
// each self-hosted and subset per weight as usual.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ font?: string }>;
}) {
  const { font } = await searchParams;
  const choice = resolveDisplayFont(font);

  return (
    <div className={`${fraunces.variable} ${instrumentSerif.variable} ${newsreader.variable}`}>
      <HomeContent displayFont={DISPLAY_FONT_VAR[choice]} />
    </div>
  );
}
