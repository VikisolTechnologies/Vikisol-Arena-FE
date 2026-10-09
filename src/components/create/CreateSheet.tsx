"use client";

import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { rise } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { SkylineFooter } from "@/components/bplus/Screen";
import { useSessionRole } from "@/hooks/use-arena-session";
import { JENNY_PREVIEW } from "@/lib/data/jenny";
import { BriefcaseSolid, GiftSolid, HeartSolid, LeafSolid, PeopleSolid, SparkleSolid } from "@/components/bplus/SolidIcons";

type Icon = typeof HeartSolid;

const ROWS: { id: "ask" | "offer" | "activity" | "project" | "job" | "jenny"; title: string; short: string; detail: string; icon: Icon; cls: string }[] = [
  { id: "activity", title: "Create an Activity", short: "Activity", detail: "Host an event, meetup or something fun.", icon: PeopleSolid, cls: "bg-primary-on-paper" },
  { id: "ask", title: "Post a Need", short: "Need", detail: "Ask for help, suggestions or something you're looking for.", icon: HeartSolid, cls: "bg-[color-mix(in_oklch,var(--slate)_62%,black)]" },
  { id: "offer", title: "Make an Offer", short: "Offer", detail: "Share something you can offer to the community.", icon: GiftSolid, cls: "bg-success-on-paper" },
  { id: "job", title: "Post a Job", short: "Job", detail: "Post a job or hiring opportunity.", icon: BriefcaseSolid, cls: "bg-info-on-paper" },
  { id: "project", title: "Start a Project", short: "Project", detail: "Collaborate for a bigger impact.", icon: LeafSolid, cls: "bg-paper-ink" },
  { id: "jenny", title: "Ask Jenny", short: "Ask Jenny", detail: "Get ideas, draft a post, or find the right people.", icon: SparkleSolid, cls: "bg-paper-ink" },
];

/** "Create on Arena" (founder mockup, Oct 2026): six tiles, each opening its full flow. */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const role = useSessionRole();

  const choose = (id: (typeof ROWS)[number]["id"]) => {
    if (id === "jenny") {
      onClose();
      // Board "Create — Jenny drafts, you approve"; without the preview world, her home.
      router.push(JENNY_PREVIEW ? "/agent/draft" : "/agent");
      return;
    }
    const FLOW: Record<string, string> = { ask: "/needs/new", offer: "/offers/new", activity: "/activities/new", project: "/projects/new" };
    if (FLOW[id]) {
      onClose();
      router.push(FLOW[id]);
      return;
    }
    if (id === "job") {
      onClose();
      router.push(role === "company_admin" || role === "recruiter" ? "/enterprise/postings" : "/identity");
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Create">
      <div>
        <h2 className="mt-3 pr-12 font-display-serif text-[28px] font-medium leading-[1.1]">Create on Arena</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">Share with your neighborhood. Real people. Real outcomes.</p>
        <m.ul initial="hidden" animate="shown" className="mt-5 grid grid-cols-2 gap-2.5">
          {ROWS.map((row, i) => {
            const IconCmp = row.icon;
            return (
              <m.li key={row.id} variants={rise} custom={i}>
                <button
                  type="button"
                  onClick={() => choose(row.id)}
                  aria-label={`${row.title}. ${row.detail}`}
                  className={`flex h-full min-h-[132px] w-full flex-col items-center justify-center gap-1.5 rounded-tile px-3 py-4 text-center text-white outline-none transition-transform duration-120 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${row.cls}`}
                >
                  <IconCmp className="size-7" aria-hidden />
                  <span className="text-[17px] font-semibold">{row.short}</span>
                  <span className="text-[13px] leading-snug text-white/90">{row.detail}</span>
                </button>
              </m.li>
            );
          })}
        </m.ul>
        <SkylineFooter onPaper className="-mx-2 mt-2 pt-4" />
      </div>
    </BottomSheet>
  );
}

