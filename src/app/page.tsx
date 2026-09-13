import dynamic from "next/dynamic";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";

// PERF-BASELINE.md Pass 2's own next-step recommendation, not yet done: every individual
// section already defers its OWN gsap animator via next/dynamic(ssr:false) - Hero, OpenMarket,
// AuraBackground, and the shared Reveal/CountUp all do this correctly. What was still missing is
// splitting the below-the-fold SECTION components themselves out of page.tsx's initial bundle -
// their base React/data-fetching code (getLandingStats, getFeaturedProject) was shipping in the
// critical path even though nothing about them needs to be interactive before Hero is. No
// `ssr: false` here on purpose - these still need to server-render for SEO and the no-JS
// baseline, this only splits the CLIENT bundle, not the HTML.
const OvernightReport = dynamic(() => import("@/components/landing/OvernightReport").then((m) => m.OvernightReport));
const TalentUniverse = dynamic(() => import("@/components/landing/TalentUniverse").then((m) => m.TalentUniverse));
const OpenMarket = dynamic(() => import("@/components/landing/OpenMarket").then((m) => m.OpenMarket));
const CtaFooter = dynamic(() => import("@/components/landing/CtaFooter").then((m) => m.CtaFooter));

export default function Home() {
  return (
    <div className="relative isolate w-full overflow-x-hidden bg-background text-foreground">
      <AuraBackground />
      <Nav />
      <Hero />
      <OvernightReport />
      <TalentUniverse />
      <OpenMarket />
      <CtaFooter />
    </div>
  );
}
