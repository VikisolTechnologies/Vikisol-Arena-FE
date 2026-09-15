"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentOrb } from "./AgentOrb";
import { cn } from "@/lib/utils";

const Animator = dynamic(() => import("./HeroAnimator").then((m) => m.HeroAnimator), { ssr: false });

// ARENA-FINISH-IT.md §4 - was "It works while you sleep" / "Wake your agent" / an "Ask
// anything" box that routed to signup no matter what you typed: describing a fully autonomous
// job-hunting agent (scans openings, applies with a tailored resume, books interviews) that
// isn't built - the closest real thing is a chat surface behind a real login, not an
// unauthenticated one that pretends to act on what you type. Rewritten around what Arena
// actually does today: real activities, needs, and work, with real people nearby, not a job
// board. Draft only - flagged for the founder to correct the wording, per §4's own instruction.
export function Hero() {
  const scopeRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const revealProps = (extra?: string) => ({
    "data-hero": reduced ? undefined : true,
    className: cn(!reduced && "reveal", extra),
  });

  return (
    <section
      ref={scopeRef}
      id="hero"
      className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] items-center gap-6 px-5 pt-[110px] sm:px-6 lg:grid-cols-[1.05fr_0.95fr]"
    >
      <div>
        <Badge variant="glass" {...revealProps()}>
          <span className="size-2 rounded-full bg-[#3ddc84]" />
          Not a job board
        </Badge>

        <h1
          {...revealProps("mt-5 font-display text-[clamp(44px,6.4vw,88px)] font-bold leading-[1.02] tracking-tight")}
        >
          Real things,{" "}
          <span className="bg-linear-to-r from-primary-soft to-primary bg-clip-text text-transparent">
            happening near you.
          </span>
        </h1>

        <p {...revealProps("mt-5.5 max-w-[480px] text-[17px] leading-relaxed text-muted-foreground")}>
          Join a pickup game, ask your neighborhood for a hand, bid on a freelance project, or apply
          to a real role — all in one place, all real people nearby.
        </p>

        <div {...revealProps("mt-6.5 mb-6.5 flex flex-wrap gap-3.5")}>
          <Button variant="primary-gradient" size="cta" render={<Link href="/auth" />} nativeButton={false}>
            Get started
          </Button>
          {/* Scrolls to the section just below, a concrete look at the four real ways to start
              something on Arena - no demo video exists yet. */}
          <Button
            variant="ghost-glass"
            size="cta"
            onClick={() => document.getElementById("overnight")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" })}
          >
            See how it works ▷
          </Button>
        </div>
      </div>

      <AgentOrb />
      {!reduced && <Animator scopeRef={scopeRef} />}
    </section>
  );
}
