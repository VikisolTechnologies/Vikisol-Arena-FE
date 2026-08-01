"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentOrb } from "./AgentOrb";
import { cn } from "@/lib/utils";

export function Hero() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const gsap = useGsap();

  useGSAP(
    () => {
      if (reduced) return;
      gsap.to("[data-hero]", {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.15,
      });
    },
    { scope: scopeRef, dependencies: [reduced] },
  );

  const revealProps = (extra?: string) => ({
    "data-hero": reduced ? undefined : true,
    className: cn(!reduced && "reveal", extra),
  });

  return (
    <section
      ref={scopeRef}
      id="agent"
      className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] items-center gap-6 px-5 pt-[110px] sm:px-6 lg:grid-cols-[1.05fr_0.95fr]"
    >
      <div>
        <Badge variant="glass" {...revealProps()}>
          <span className="size-2 rounded-full bg-[#3ddc84]" />
          Your agent is awake · 02:41 AM
        </Badge>

        <h1
          {...revealProps("mt-5 font-display text-[clamp(44px,6.4vw,88px)] font-bold leading-[1.02] tracking-tight")}
        >
          It works while{" "}
          <span className="bg-linear-to-r from-primary-soft to-primary bg-clip-text text-transparent">
            you sleep.
          </span>
        </h1>

        <p {...revealProps("mt-5.5 max-w-[480px] text-[17px] leading-relaxed text-muted-foreground")}>
          Arena&apos;s agent hunts openings across every industry, applies with a tailored resume, and
          books your interviews — day and night.
        </p>

        <div {...revealProps("mt-6.5 mb-6.5 flex flex-wrap gap-3.5")}>
          <Button variant="primary-gradient" size="cta">
            Wake your agent
          </Button>
          <Button variant="ghost-glass" size="cta">
            Watch it work ▷
          </Button>
        </div>

        <div {...revealProps("max-w-[520px]")}>
          <Input
            placeholder='Ask anything — "find me remote design contracts"'
            className="h-[60px] rounded-full border-border bg-white/[0.03] px-5.5 text-[15px] backdrop-blur-xl placeholder:text-[#8b8b93]"
          />
        </div>
      </div>

      <AgentOrb />
    </section>
  );
}
