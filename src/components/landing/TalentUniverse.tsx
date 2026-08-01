import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Reveal } from "./Reveal";
import { Starfield } from "./Starfield";

const CATEGORIES = [
  { label: "Engineering · 82k", color: "#FF6B35" },
  { label: "Design · 41k", color: "#FF8A5B" },
  { label: "Sales · 37k", color: "#FFB38A" },
  { label: "Healthcare · 24k", color: "#fff" },
];

export function TalentUniverse() {
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
            2,40,000 people open to work — every industry, contract or full-time. Search them from
            your own enterprise login.
          </Reveal>

          <Reveal delay={0.15} className="mx-auto mb-5.5 flex max-w-[640px] items-center gap-3 rounded-full border border-border bg-white/5 py-1.5 pl-5.5 pr-1.5 backdrop-blur-xl">
            <Input
              defaultValue='Try "senior React developer · contract · Hyderabad"'
              readOnly
              className="h-auto flex-1 border-0 bg-transparent p-0 text-[#8b8b93] shadow-none focus-visible:ring-0"
            />
            <Button variant="primary-gradient" size="cta-sm" className="shrink-0">
              Search
            </Button>
          </Reveal>

          <Reveal delay={0.2} className="flex flex-wrap justify-center gap-2.5">
            {CATEGORIES.map((cat) => (
              <Badge key={cat.label} variant="glass" className="border-border text-[#d4d4d8]">
                <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                {cat.label}
              </Badge>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
