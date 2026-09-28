"use client";

import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { m } from "motion/react";
import { Briefcase, ChevronRight, Gift, Heart, Leaf, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { useSessionRole } from "@/hooks/use-arena-session";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

const ROWS: { id: "ask" | "offer" | "activity" | "project" | "job" | "jenny"; title: string; detail: string; icon: Icon; disc: string }[] = [
  { id: "ask", title: "Post a Need", detail: "Get help from nearby people", icon: Heart, disc: "bg-primary" },
  { id: "offer", title: "Make an Offer", detail: "Share what you can give", icon: Gift, disc: "bg-success" },
  { id: "activity", title: "Create an Activity", detail: "Bring people together", icon: Users, disc: "bg-info" },
  { id: "project", title: "Start a Project", detail: "Collaborate for a bigger impact", icon: Leaf, disc: "bg-success" },
  { id: "job", title: "Post a Job", detail: "Find local talent", icon: Briefcase, disc: "bg-primary" },
  { id: "jenny", title: "Ask Jenny", detail: "Get ideas, draft a post, or find the right people", icon: Sparkles, disc: "bg-[linear-gradient(135deg,var(--primary),var(--primary-soft))]" },
];


/** Board: "What do you want to make happen?" — six options, each opening its full flow. */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const role = useSessionRole();

  const choose = (id: (typeof ROWS)[number]["id"]) => {
    if (id === "jenny") {
      onClose();
      router.push("/agent");
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
            <h2 className="mt-3 pr-12 font-display-serif text-[30px] font-medium leading-[1.1]">What do you want to make happen?</h2>
            <p className="mt-2 text-[15px] text-paper-ink-muted">A small step can create a big ripple nearby.</p>
            <m.ul initial="hidden" animate="shown" className="mt-6 space-y-2.5">
              {ROWS.map((row, i) => {
                const IconCmp = row.icon;
                return (
                  <m.li key={row.id} variants={rise} custom={i}>
                    <button
                      type="button"
                      onClick={() => choose(row.id)}
                      className="flex w-full items-center gap-3.5 rounded-tile bg-paper-muted p-3.5 text-left outline-none transition-transform duration-120 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-white", row.disc)}>
                        <IconCmp className="size-6" strokeWidth={1.9} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold">{row.title}</span>
                        <span className="block text-[13px] text-paper-ink-muted">{row.detail}</span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                    </button>
                  </m.li>
                );
              })}
            </m.ul>
          </div>
    </BottomSheet>
  );
}

