"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { BellRing, Check, ChevronRight, FilePen, ListChecks, Lock, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, rise, vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { PreviewPill, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { useJobSearch } from "@/components/jenny/useJenny";
import { JENNY_PREVIEW, readJobSearch, writeJobSearch, type JobSearchRecipe } from "@/lib/data/jenny";
import { careerValues } from "@/lib/jenny/career";
import { getMyProfile } from "@/lib/api/profile";
import type { CandidateProfile } from "@/lib/types";

type StepKey = "trigger" | "shortlist" | "drafts" | "reminders" | "never";

/**
 * VNext "Jenny automates the outcome" #4 — My job search: Trigger → Then → Then → Then → Never.
 * The three "Then" steps can be switched off; the Never row is the fixed floor of the recipe —
 * Jenny never submits an application without your approval, and it can't be removed.
 */
export function AutomationScreen() {
  const router = useRouter();
  const recipe = useJobSearch();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [open, setOpen] = useState<StepKey | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => {});
  }, []);

  if (!JENNY_PREVIEW) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="empty" title="Job search with Jenny is coming" detail="You can already find and apply to jobs yourself." action={<ButtonLink href="/jobs">Browse jobs</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const roles = profile ? ((careerValues(profile).roles as string[] | undefined) ?? [profile.title].filter(Boolean)) : [];
  const set = (patch: Partial<JobSearchRecipe>) => writeJobSearch({ ...readJobSearch(), ...patch });
  const steps: { key: StepKey; kind: string; text: string; on: boolean; icon: typeof Check; tone: string }[] = recipe
    ? [
        { key: "trigger", kind: "Trigger", text: "Watch for new verified roles that match my preferences", on: true, icon: Check, tone: "bg-success-on-paper" },
        { key: "shortlist", kind: "Then", text: "Shortlist by my must-haves", on: recipe.shortlist, icon: ListChecks, tone: "bg-info-on-paper" },
        { key: "drafts", kind: "Then", text: "Prepare application drafts", on: recipe.drafts, icon: FilePen, tone: "bg-info-on-paper" },
        { key: "reminders", kind: "Then", text: "Remind me about good matches and follow-ups", on: recipe.reminders, icon: BellRing, tone: "bg-info-on-paper" },
        { key: "never", kind: "Never", text: "Submit any application without my approval", on: true, icon: Lock, tone: "bg-danger-on-paper" },
      ]
    : [];

  return (
    <AppShell tone="light">
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">My job search</h1>
          <Link href="/agent?tab=automations" aria-label="Close" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper-muted">
            <X className="size-6" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
        <p className="mt-2 flex items-center gap-2 text-[15px] text-paper-ink-muted">Jenny will handle the repetitive work. You make the decisions. <PreviewPill /></p>

        {!recipe ? (
          <Skeleton className="mt-6 h-80 w-full" />
        ) : (
          <>
            <m.ol initial="hidden" animate="shown" className="relative mt-6" aria-label="Automation steps">
              <span aria-hidden className="absolute bottom-8 left-[19px] top-8 w-0.5 bg-paper-ink/15" />
              {steps.map((s, i) => (
                <m.li key={s.key} variants={rise} custom={i} className="relative">
                  <button type="button" onClick={() => setOpen(s.key)} className={cn("flex min-h-[72px] w-full items-center gap-3.5 py-2 text-left", !s.on && "opacity-55")}>
                    <span aria-hidden className={cn("relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-white", s.tone)}>
                      <s.icon className="size-5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1 border-b border-paper-ink/10 pb-2">
                      <span className={cn("block text-[15px] font-semibold", s.key === "never" ? "text-danger-on-paper" : s.key === "trigger" ? "text-success-on-paper" : "text-info-on-paper")}>
                        {s.kind}
                        {!s.on && <span className="font-normal text-paper-ink-muted"> · off</span>}
                      </span>
                      <span className="block text-[16px]">{s.text}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" aria-hidden />
                  </button>
                </m.li>
              ))}
            </m.ol>

            <button type="button" onClick={() => setEditOpen(true)} className="mx-auto mt-3 flex min-h-11 items-center gap-2 rounded-full border border-paper-ink/40 px-5 text-[15px] font-semibold">
              <Pencil className="size-4" aria-hidden /> Edit automation
            </button>

            <AnimatePresence mode="wait" initial={false}>
              <m.section key={recipe.on ? "on" : "ready"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="mt-5 flex items-start gap-3 rounded-tile bg-success/12 p-4 ring-1 ring-success/40" role="status">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-success-on-paper text-white"><Check className="size-4" strokeWidth={3} /></span>
                <span>
                  <span className="block text-[16px] font-semibold text-success-on-paper">{recipe.on ? "Automation is on" : "Automation ready"}</span>
                  <span className="block text-[14px]">{recipe.on ? "Jenny is looking for opportunities in private. You'll see them in your shortlist." : "Jenny will start looking for opportunities in private."}</span>
                </span>
              </m.section>
            </AnimatePresence>

            {recipe.on ? (
              <div className="mt-5 space-y-2.5">
                <ButtonLink href="/identity/career/shortlist">See today&apos;s shortlist</ButtonLink>
                <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={() => set({ on: false })}>Turn off automation</Button>
              </div>
            ) : (
              <Button
                className="mt-5"
                onClick={() => {
                  set({ on: true });
                  vibrate();
                  router.push("/identity/career/shortlist");
                }}
              >
                Turn on automation
              </Button>
            )}
          </>
        )}
      </div>

      <BottomSheet open={!!open} onClose={() => setOpen(null)} title="Automation step">
        {open && recipe && (
          <div>
            {open === "trigger" && (
              <>
                <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">What Jenny watches for</h2>
                <p className="mt-2 text-[15px]">New roles from verified companies that match {roles.length ? <strong>{roles.join(", ")}</strong> : "your desired roles"} and your preferred locations and work mode.</p>
                <ButtonLink href="/identity/career?step=setup" variant="outline" className="mt-5 border-paper-ink/55 text-paper-ink">Change preferences</ButtonLink>
              </>
            )}
            {(open === "shortlist" || open === "drafts" || open === "reminders") && (
              <>
                <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">{steps.find((s) => s.key === open)!.text}</h2>
                <p className="mt-2 text-[15px] text-paper-ink-muted">
                  {open === "shortlist" ? "Each role shows how many of its must-haves your profile covers — counts, never a score." : open === "drafts" ? "Drafts wait in Review application. Nothing is submitted until you approve it." : "Reminders only remind you. Nothing is sent to anyone."}
                </p>
                <div className="mt-4 rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
                  <PaperSwitch label="On" checked={recipe[open]} onChange={(v) => set({ [open]: v })} />
                </div>
              </>
            )}
            {open === "never" && (
              <>
                <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">This one can&apos;t be switched off</h2>
                <p className="mt-2 text-[15px]">Jenny never submits an application without your approval. Every application shows you the job, your answers and exactly what&apos;s shared — then you decide.</p>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit automation">
        {recipe && (
          <div>
            <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">Edit automation</h2>
            <div className="mt-3 divide-y divide-paper-ink/10 rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
              <PaperSwitch label="Shortlist by must-haves" checked={recipe.shortlist} onChange={(v) => set({ shortlist: v })} />
              <PaperSwitch label="Prepare application drafts" checked={recipe.drafts} onChange={(v) => set({ drafts: v })} />
              <PaperSwitch label="Remind me about matches and follow-ups" checked={recipe.reminders} onChange={(v) => set({ reminders: v })} />
            </div>
            <p className="mt-3 flex items-center gap-2 text-[14px] text-paper-ink-muted"><Lock className="size-4" aria-hidden /> Never submits without your approval — always on.</p>
            <Button className="mt-5" onClick={() => setEditOpen(false)}>Done</Button>
          </div>
        )}
      </BottomSheet>
    </AppShell>
  );
}
