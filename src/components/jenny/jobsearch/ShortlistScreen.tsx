"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { m } from "motion/react";
import { Check, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { PreviewPill, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { CompanyMark } from "@/components/career/CompanyMark";
import { useJobSearch } from "@/components/jenny/useJenny";
import { getJobs } from "@/lib/api/jobs";
import { getMyApplications } from "@/lib/api/applications";
import { getMyProfile } from "@/lib/api/profile";
import { JENNY_PREVIEW } from "@/lib/data/jenny";
import { careerValues, jobEvidence } from "@/lib/jenny/career";
import type { CandidateProfile, Job } from "@/lib/types";

const posted = (d: number) => (d <= 0 ? "Today" : d === 1 ? "1d ago" : `${d}d ago`);

/** Roles whose title shares a word with what the person is looking for (never ranked by fit). */
function relevant(jobs: Job[], wanted: string[]) {
  const words = wanted.flatMap((w) => w.toLowerCase().split(/\s+/)).filter((w) => w.length > 3 && !["senior", "junior", "lead"].includes(w));
  return jobs.filter((j) => words.some((w) => j.title.toLowerCase().includes(w.replace(/er$/, ""))));
}

/**
 * VNext "Jenny automates the outcome" #5 — Today's shortlist. Each role shows evidence counts
 * against its must-haves (Matches / Questions / Missing — correction #4, never a %) and "Why
 * this" in plain reasons; newest first. Tapping a role opens its application for review.
 */
export function ShortlistScreen() {
  const recipe = useJobSearch();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), getJobs(), getMyApplications().catch(() => [])])
      .then(([p, j, a]) => {
        if (cancelled) return;
        setProfile(p);
        setJobs(j);
        setApplied(new Set(a.map((x) => x.jobId).filter((x): x is string => !!x)));
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const list = useMemo(() => {
    if (!profile || !jobs) return null;
    const wanted = ((careerValues(profile).roles as string[] | undefined) ?? []).concat(profile.title ? [profile.title] : []);
    return relevant(jobs, wanted)
      .filter((j) => !applied.has(j.id) && (!remoteOnly || j.remote))
      .sort((a, b) => a.postedDaysAgo - b.postedDaysAgo)
      .slice(0, 5);
  }, [profile, jobs, applied, remoteOnly]);

  if (!JENNY_PREVIEW) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="empty" title="No shortlist yet" detail="Browse jobs near you and apply when one fits." action={<ButtonLink href="/jobs">Browse jobs</ButtonLink>} /></div>
      </AppShell>
    );
  }

  return (
    <AppShell tone="light">
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display-serif text-[30px] font-medium">Today&apos;s shortlist</h1>
          <button type="button" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-paper-ink/25 px-3.5 text-[14px] font-semibold">
            <SlidersHorizontal className="size-4" aria-hidden /> Filters
          </button>
        </div>
        <p className="mt-1 flex items-center gap-2 text-[15px] text-paper-ink-muted">
          {list ? `${list.length} ${list.length === 1 ? "role" : "roles"} for you` : "Looking…"} · newest first <PreviewPill />
        </p>
        {recipe && !recipe.on && (
          <p className="mt-3 rounded-tile bg-paper-muted p-3.5 text-[14px]">
            Your job search automation is off, so this list won&apos;t refresh. <Link href="/identity/career/automation" className="font-semibold text-primary-on-paper underline underline-offset-4">Turn it on</Link>
          </p>
        )}

        {error ? (
          <div className="mt-6"><StateCard kind="error" title="The shortlist didn't load" detail="Check your connection and try again." /></div>
        ) : !list || !profile ? (
          <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : list.length === 0 ? (
          <div className="mt-6"><StateCard kind="empty" title="Nothing new today" detail="Jenny keeps watching. Roles that fit your preferences show up here." action={<ButtonLink href="/jobs">Browse all jobs</ButtonLink>} /></div>
        ) : (
          <m.ul initial="hidden" animate="shown" className="mt-5 space-y-3">
            {list.map((job, i) => (
              <m.li key={job.id} variants={rise} custom={i}>
                <ShortlistCard job={job} profile={profile} />
              </m.li>
            ))}
          </m.ul>
        )}
      </div>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">Filters</h2>
        <div className="mt-3 rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
          <PaperSwitch label="Remote only" checked={remoteOnly} onChange={setRemoteOnly} />
        </div>
        <p className="mt-3 text-[14px] text-paper-ink-muted">Roles, locations and work mode come from your career preferences.</p>
        <ButtonLink href="/identity/career?step=setup" variant="outline" className="mt-4 border-paper-ink/55 text-paper-ink">Edit preferences</ButtonLink>
        <Button className="mt-2.5" onClick={() => setFiltersOpen(false)}>Show roles</Button>
      </BottomSheet>
    </AppShell>
  );
}

function ShortlistCard({ job, profile }: { job: Job; profile: CandidateProfile }) {
  const [open, setOpen] = useState(true);
  const ev = jobEvidence(job, profile);
  const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold";
  return (
    <article className="overflow-hidden rounded-tile bg-surface ring-1 ring-paper-ink/10">
      <Link href={`/applications/new?job=${encodeURIComponent(job.id)}`} className="flex items-start gap-3 p-4 pb-2 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <CompanyMark name={job.company} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] text-paper-ink-muted">{job.company}</span>
          <span className="block text-[17px] font-semibold leading-snug">{job.title}</span>
          <span className="block text-[13px] text-paper-ink-muted">{[job.location.split(",")[0], job.remote ? "Remote" : null, posted(job.postedDaysAgo)].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronRight className="mt-3 size-5 shrink-0 text-paper-ink-muted" aria-hidden />
      </Link>
      <ul className="flex flex-wrap gap-1.5 px-4" aria-label={`Must-haves: ${ev.matches} on your profile, ${ev.questions} partly, ${ev.missing} missing`}>
        <li className={cn(chip, "bg-success/15 text-success-on-paper")}>Matches {ev.matches}</li>
        {ev.questions > 0 && <li className={cn(chip, "bg-info/12 text-info-on-paper")}>Questions {ev.questions}</li>}
        {ev.missing > 0 && <li className={cn(chip, "bg-primary/10 text-primary-on-paper")}>Missing {ev.missing}</li>}
      </ul>
      <div className="px-4 pb-3 pt-2">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-11 items-center gap-1.5 text-[15px] font-semibold">
          Why this <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
        </button>
        {open && (
          <ul className="space-y-1 pb-1">
            {ev.reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[14px]">
                <Check className="mt-0.5 size-4 shrink-0 text-success-on-paper" strokeWidth={2.5} aria-hidden /> {r}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="sr-only">Must-haves checked: {ev.must.join(", ")}</p>
    </article>
  );
}
