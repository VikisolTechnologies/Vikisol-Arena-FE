"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const Animator = dynamic(() => import("./AgentOrbAnimator").then((m) => m.AgentOrbAnimator), { ssr: false });

const CHIPS = [
  { className: "left-[-4%] top-[6%] rotate-[-5deg]", icon: "✓", label: "Applied", value: "3 jobs tonight" },
  { className: "right-[-6%] top-[26%] rotate-[5deg]", icon: "🔍", label: "Found", value: "12 new matches" },
  { className: "bottom-[8%] left-[12%] rotate-[3deg]", icon: "📅", label: "Interview", value: "Tue 3:00 PM" },
];

/** The living agent orb — eyes, orbit rings, floating activity chips. Matches arena-prototype.html's #orb exactly. */
export function AgentOrb() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  return (
    <div className="order-first grid h-auto place-items-center lg:order-none lg:h-[min(620px,70vw)]">
      <div
        ref={wrapRef}
        className="relative my-2.5 aspect-square w-[min(300px,72vw)] lg:my-0 lg:w-[min(420px,78vw)]"
        style={{ perspective: reduced ? undefined : "800px" }}
      >
        {/* glow */}
        <div
          className="absolute inset-[-22%] rounded-full blur-[30px]"
          style={{ background: "radial-gradient(circle, rgba(255,107,53,0.5), transparent 62%)" }}
        />

        {/* orbit rings */}
        <div className="arena-ring-1 absolute left-1/2 top-1/2 h-[48%] w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] rounded-full border border-white/[0.14]">
          <i className="absolute left-[-4px] top-1/2 size-2.5 rounded-full bg-primary-soft shadow-[0_0_12px_var(--primary)]" />
        </div>
        <div className="arena-ring-2 absolute left-1/2 top-1/2 h-[60%] w-[168%] -translate-x-1/2 -translate-y-1/2 rotate-[22deg] rounded-full border border-white/[0.08]">
          <i className="absolute right-[-4px] top-[40%] size-2.5 rounded-full bg-primary-soft shadow-[0_0_12px_var(--primary)]" />
        </div>

        {/* orb body */}
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            background:
              "radial-gradient(circle at 36% 30%, #4a2c1a 0%, #241108 46%, #6e2f12 78%, #FF6B35 100%)",
            boxShadow:
              "inset -30px -40px 80px rgba(0,0,0,0.55), inset 20px 30px 60px rgba(255,138,91,0.15)",
          }}
        >
          <div className="absolute left-[16%] top-[12%] h-[26%] w-[42%] rounded-full bg-white/[0.12] blur-[16px]" />
        </div>

        {/* eyes + smile */}
        <div className="arena-eyes absolute left-1/2 top-[44%] flex w-[52%] -translate-x-1/2 -translate-y-1/2 gap-[20%]">
          <div className="arena-eye relative h-14 w-[38px] rounded-full bg-[#FFF6EF] shadow-[0_0_22px_rgba(255,246,239,0.65)]">
            <span className="absolute left-1/2 top-[56%] h-[22px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
          </div>
          <div className="arena-eye relative h-14 w-[38px] rounded-full bg-[#FFF6EF] shadow-[0_0_22px_rgba(255,246,239,0.65)]">
            <span className="absolute left-1/2 top-[56%] h-[22px] w-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
          </div>
        </div>
        <div
          className="absolute left-1/2 top-[60%] h-[34px] w-[76px] -translate-x-1/2 rounded-b-[60px] border-b-[5px] border-[#FFD9C4]"
          aria-hidden
        />

        {/* activity chips */}
        {CHIPS.map((chip) => (
          <div
            key={chip.label}
            className={`arena-chip absolute whitespace-nowrap rounded-full border border-border bg-white/[0.09] px-4.5 py-3 text-sm font-medium text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md ${chip.className}`}
          >
            {chip.icon} {chip.label} · <b className="font-semibold text-primary-soft">{chip.value}</b>
          </div>
        ))}
      </div>
      {!reduced && <Animator wrapRef={wrapRef} />}
    </div>
  );
}
