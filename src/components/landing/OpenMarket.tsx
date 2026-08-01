"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { useGsap } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

const BIDS = [
  { amount: "₹ 3,80,000", who: "Ravi K. · 96% match", top: true },
  { amount: "₹ 4,20,000", who: "Studio Nava · 91% match", top: false },
  { amount: "₹ 3,45,000", who: "Meera D. · 88% match", top: false },
];

function formatTimer(totalSeconds: number) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function OpenMarket() {
  const [seconds, setSeconds] = useState(4 * 3600 + 12 * 60 + 36);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const gsap = useGsap();

  useEffect(() => {
    const id = setInterval(() => setSeconds((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      if (reduced || !cardRef.current) return;
      gsap.from(cardRef.current.querySelectorAll(".arena-bid-row"), {
        x: 40,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: cardRef.current, start: "top 80%" },
      });
    },
    { scope: cardRef, dependencies: [reduced] },
  );

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
            <Button variant="primary-gradient" size="cta">
              Post a project
            </Button>
            <Button variant="ghost-glass" size="cta">
              Browse open bids →
            </Button>
          </Reveal>
        </div>

        <div
          ref={cardRef}
          className="reveal rounded-[24px] border border-border bg-white/5 p-7 backdrop-blur-[18px]"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/[0.14] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary-soft">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            LIVE BID
          </span>
          <h3 className="mt-4 font-display text-[22px] font-bold">Food delivery app — full product design</h3>
          <div className="mb-5 mt-1.5 text-[13.5px] text-[#8b8b93]">
            Budget open · 6 weeks · ends in{" "}
            <b className="text-[#d4d4d8]">{formatTimer(seconds)}</b>
          </div>

          <div className="space-y-3">
            {BIDS.map((bid) => (
              <div
                key={bid.who}
                className={`arena-bid-row flex items-center justify-between rounded-2xl border border-border px-4.5 py-4 ${bid.top ? "bg-white/[0.09]" : "bg-white/[0.04]"}`}
              >
                <div>
                  <div className={`font-display text-[19px] font-bold ${bid.top ? "text-primary-soft" : ""}`}>
                    {bid.amount}
                  </div>
                  <div className="mt-0.5 text-[13.5px] text-[#8b8b93]">{bid.who}</div>
                </div>
                {bid.top && <span className="text-[12.5px] font-semibold text-primary-soft">agent pick ★</span>}
              </div>
            ))}
          </div>

          <Button variant="primary-gradient" size="cta" className="mt-2.5 w-full">
            Place a bid
          </Button>
        </div>
      </div>
    </section>
  );
}
