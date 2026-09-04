"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { getFeaturedProject } from "@/lib/api/publicLanding";
import { formatINR, formatINRRange } from "@/lib/format";
import type { Project } from "@/lib/types";

const Animator = dynamic(() => import("./OpenMarketAnimator").then((m) => m.OpenMarketAnimator), { ssr: false });

function formatCountdown(endsAt: string) {
  const totalSeconds = Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000);
  if (totalSeconds <= 0) return "closing";
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function OpenMarket() {
  // Was 3 hardcoded fake bids ("Ravi K.", "Studio Nava"...) and a countdown that started from a
  // fixed number on every page load and would silently count into negative time - looked "live"
  // but wasn't wired to anything real. Now pulls the actual highest-activity open project (and
  // its real bids) from arena-api's public landing endpoint; `project === null` (still loading,
  // or genuinely no open project exists yet) renders an honest empty state instead of fake data.
  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    getFeaturedProject()
      .then(setProject)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const topBids = project ? [...project.bids].sort((a, b) => b.amount - a.amount).slice(0, 3) : [];

  return (
    <section id="market" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 sm:px-6">
      <Reveal as="div" className="pb-0 pt-[110px] font-display text-xs font-bold tracking-[5px] text-primary-soft">
        OPEN MARKET
      </Reveal>

      <div className="grid gap-10 pb-10 pt-8 lg:grid-cols-2 lg:items-center">
        <div>
          <Reveal as="h2" className="font-display text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.1] tracking-tight">
            Every skill has a <span className="text-primary-soft">market.</span>
          </Reveal>
          <Reveal as="p" delay={0.05} className="my-4.5 max-w-[440px] text-[16.5px] leading-relaxed text-muted-foreground">
            Post a project and take bids in the open. Hire on proof, not resumes — from developers
            to designers to doctors. Your agent shortlists the bids worth your time.
          </Reveal>
          <Reveal delay={0.1} className="flex flex-wrap gap-3.5">
            <Button variant="primary-gradient" size="cta" render={<Link href="/auth" />} nativeButton={false}>
              Post a project
            </Button>
            <Button variant="ghost-glass" size="cta" render={<Link href="/auth" />} nativeButton={false}>
              Browse open bids →
            </Button>
          </Reveal>
        </div>

        <div
          ref={cardRef}
          className="reveal rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]"
        >
          {project ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/[0.14] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-soft">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                LIVE BID
              </span>
              <h3 className="mt-4 font-display text-[22px] font-bold">{project.title}</h3>
              <div className="mb-5 mt-1.5 text-[13.5px] text-[#8b8b93]">
                {formatINRRange(project.budgetMin, project.budgetMax)} · {project.durationWeeks} weeks · ends in{" "}
                <b className="text-[#d4d4d8]">{formatCountdown(project.endsAt)}</b>
              </div>

              <div className="space-y-3">
                {topBids.map((bid, i) => (
                  <div
                    key={bid.id}
                    className={`arena-bid-row flex items-center justify-between rounded-2xl border border-border px-4.5 py-4 ${i === 0 ? "bg-white/[0.09]" : "bg-white/[0.04]"}`}
                  >
                    <div>
                      <div className={`font-display text-[19px] font-bold ${i === 0 ? "text-primary-soft" : ""}`}>
                        {formatINR(bid.amount)}
                      </div>
                      <div className="mt-0.5 text-[13.5px] text-[#8b8b93]">
                        {bid.bidderName} · {bid.matchPercentage}% match
                      </div>
                    </div>
                    {bid.agentPick && <span className="text-[12.5px] font-semibold text-primary-soft">agent pick ★</span>}
                  </div>
                ))}
                {topBids.length === 0 && (
                  <p className="rounded-2xl border border-border bg-white/[0.04] px-4.5 py-4 text-[13.5px] text-[#8b8b93]">
                    No bids yet — be the first.
                  </p>
                )}
              </div>

              <Button
                variant="primary-gradient"
                size="cta"
                className="mt-2.5 w-full"
                render={<Link href="/auth" />}
                nativeButton={false}
              >
                Place a bid
              </Button>
            </>
          ) : loaded ? (
            <div className="py-6 text-center">
              <h3 className="font-display text-[19px] font-bold">No live bids right now</h3>
              <p className="mx-auto mt-2 max-w-[320px] text-[13.5px] leading-relaxed text-[#8b8b93]">
                The market&apos;s quiet this moment — post a project and be the first one up for bids.
              </p>
              <Button
                variant="primary-gradient"
                size="cta"
                className="mt-4.5 w-full"
                render={<Link href="/auth" />}
                nativeButton={false}
              >
                Post a project
              </Button>
            </div>
          ) : (
            <div className="h-[220px] animate-pulse rounded-2xl bg-white/[0.04]" />
          )}
          {!reduced && project && <Animator cardRef={cardRef} />}
        </div>
      </div>
    </section>
  );
}
