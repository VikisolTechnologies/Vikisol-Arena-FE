"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "./Reveal";
import { Starfield } from "./Starfield";
import { getLandingStats, type LandingStats } from "@/lib/api/publicLanding";

// Matches each real Industry's wire label to a display color - CATEGORY_COLORS is a fixed
// design choice (not server data), so it's kept separate from the real counts that drive which
// of these actually render.
const CATEGORY_COLORS: Record<string, string> = {
  Engineering: "#FF6B35",
  Design: "#FF8A5B",
  Sales: "#FFB38A",
  Healthcare: "#fff",
  Logistics: "#d4d4d8",
};

export function TalentUniverse() {
  // Was a hardcoded "2,40,000 people" and 4 fake per-category counts baked into the static
  // prototype - fetched once from arena-api's real, consented (searchableByEnterprises) talent
  // count so this claim is actually true. `stats === null` (still loading, or the backend didn't
  // answer) falls back to the generic copy below rather than showing a stale/fake number.
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    getLandingStats().then(setStats);
  }, []);

  return (
    <section id="universe" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 sm:px-6">
      <div
        className="relative min-h-[560px] overflow-hidden rounded-[32px] border border-border text-center"
        style={{ background: "radial-gradient(120% 120% at 50% 0%, #121017 0%, #09090B 60%)" }}
      >
        <Starfield />
        <div className="relative z-[2] w-full px-5 py-[70px] sm:px-6">
          <Reveal as="div" className="mb-4 font-display text-xs font-bold tracking-[5px] text-primary-soft">
            FOR ENTERPRISES
          </Reveal>
          <Reveal as="h2" delay={0.05} className="font-display text-[clamp(30px,4.4vw,52px)] font-bold">
            Every talent.{" "}
            <span className="bg-linear-to-r from-primary-soft to-primary bg-clip-text text-transparent">
              One universe.
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={0.1}
            className="mx-auto mb-7.5 mt-3.5 max-w-[560px] text-base text-muted-foreground"
          >
            {stats && stats.openToWorkCount > 0
              ? `${stats.openToWorkCount.toLocaleString("en-IN")} people open to work — every industry, contract or full-time. Search them from your own enterprise login.`
              : "People open to work across every industry, contract or full-time. Search them from your own enterprise login."}
          </Reveal>

          <Reveal delay={0.15} className="mx-auto mb-5.5 flex max-w-[640px] items-center gap-3 rounded-full border border-border bg-white/5 py-1.5 pl-5.5 pr-1.5 backdrop-blur-xl">
            <Input
              aria-label="Example search query"
              defaultValue='Try "senior React developer · contract · Hyderabad"'
              readOnly
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[#8b8b93] shadow-none focus-visible:ring-0"
            />
            <Button
              variant="primary-gradient"
              size="cta-sm"
              className="shrink-0"
              render={<Link href="/auth" />}
              nativeButton={false}
            >
              Search
            </Button>
          </Reveal>

          {stats && stats.byIndustry.length > 0 && (
            <Reveal delay={0.2} className="flex flex-wrap justify-center gap-2.5">
              {stats.byIndustry.map((cat) => (
                <Badge key={cat.label} variant="glass" className="border-border text-[#d4d4d8]">
                  <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[cat.label] ?? "#fff" }} />
                  {cat.label} · {cat.count.toLocaleString("en-IN")}
                </Badge>
              ))}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
