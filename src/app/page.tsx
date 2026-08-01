import { AuraBackground } from "@/components/landing/AuraBackground";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { OvernightReport } from "@/components/landing/OvernightReport";
import { TalentUniverse } from "@/components/landing/TalentUniverse";
import { OpenMarket } from "@/components/landing/OpenMarket";
import { CtaFooter } from "@/components/landing/CtaFooter";

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
