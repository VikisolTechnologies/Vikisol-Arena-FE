import { HomeContent } from "@/components/home-v3/HomeContent";

// The serif-typeface A/B picker this file used to carry (?font=fraunces|instrument|newsreader)
// was scoped to the ivory/gold "product theme" experiment - now that Home uses Arena's real,
// ecosystem-wide dark/orange brand (Space Grotesk + Inter, already loaded app-wide via
// layout.tsx), there's no per-page font choice left to make here.
export default function HomePage() {
  return <HomeContent />;
}
