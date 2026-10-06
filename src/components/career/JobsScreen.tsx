"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { m } from "motion/react";
import { Bookmark, CircleCheck, Search, Sprout } from "lucide-react";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { getJobs, getSavedJobIds, saveJob, unsaveJob } from "@/lib/api/jobs";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Job } from "@/lib/types";

/** Board: Local · Remote · On-site. ("Hybrid" is left out: jobs are listed as remote or on-site
 *  only — a Hybrid chip would always be empty. "All" stays for everything.) */
const FILTERS = [
  { id: "local", label: "Local" },
  { id: "remote", label: "Remote" },
  { id: "onsite", label: "On-site" },
  { id: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function isLocal(j: Job, p: CandidateProfile | null) {
  const places = [p?.homeCity, p?.location, ...(p?.preferredLocation ?? "").split(",")].map((x) => x?.trim().toLowerCase()).filter(Boolean) as string[];
  return !j.remote && places.some((x) => j.location.toLowerCase().includes(x));
}

/** Board "Open the career layer" #5 — Work is jobs and career. No match percentages (flow §6 honesty). */
export function JobsScreen() {
  const router = useRouter();
  const published = useSearchParams().get("published") === "1";
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [chosen, setFilter] = useState<Filter | null>(null);
  // Read once on the client (lazy init; the page is client-rendered after the onboarding guard).
  const [allJobs, setAllJobs] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    getJobs()
      .then((j) => !cancelled && (setJobs(Array.isArray(j) ? j : []), setError(false)))
      .catch(() => !cancelled && setError(true));
    getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
    getSavedJobIds().then((ids) => !cancelled && setSaved(ids)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  // Local by default (board); when nothing local is listed, start on All instead of an empty list.
  const filter: Filter = chosen ?? ((jobs ?? []).some((j) => isLocal(j, profile)) ? "local" : "all");
  const toggleSave = (id: string) => {
    const on = saved.includes(id);
    setSaved(on ? saved.filter((x) => x !== id) : [...saved, id]);
    (on ? unsaveJob(id) : saveJob(id)).catch(() => setSaved(saved));
  };
  const shown = useMemo(() => {
    const list = (jobs ?? []).filter((j) => filter === "all" || (filter === "remote" ? j.remote : filter === "onsite" ? !j.remote : isLocal(j, profile)));
    return [...list].sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }, [jobs, filter, profile]);
  const mySkills = new Set((profile?.skills ?? []).map((s) => s.name.toLowerCase()));

  return (
    <AppShell>
      <header className="flex items-start justify-between pt-3">
        <div>
          <h1 className="font-display-serif text-[34px] font-medium leading-tight">Work</h1>
          <p className="mt-1 text-[15px] text-faint">Local opportunities. Real people.</p>
        </div>
        <Link href="/search?scope=jobs" aria-label="Search jobs" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <Search className="size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </header>
      {published && (
        <m.p role="status" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 rounded-tile bg-paper p-3.5 text-[15px] font-semibold text-paper-ink">
          <CircleCheck className="size-5 text-success-on-paper" aria-hidden /> Your career profile is published.
        </m.p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/applications" className="inline-flex h-11 items-center rounded-full border border-field-line px-4 text-[15px] font-semibold">Applications</Link>
        <Link href="/identity/career" className="inline-flex h-11 items-center rounded-full border border-field-line px-4 text-[15px] font-semibold">Career profile</Link>
      </div>
      <div className="mt-3">
        <Pills label="Work mode" options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <section className="mt-5 flex-1" aria-label="Jobs near you">
        <SectionHeader title={filter === "remote" ? "Remote jobs" : "Jobs near you"} action={shown.length > 4 ? <button type="button" onClick={() => setAllJobs((v) => !v)} aria-expanded={allJobs} className="inline-flex min-h-11 items-center text-[14px] text-foreground/85 underline underline-offset-4">{allJobs ? "Show fewer" : `See all ${shown.length}`}</button> : undefined} />
        {error ? (
          <StateCard kind="error" title="Jobs didn't load" detail="Check your connection and try again." action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
        ) : !jobs ? (
          <div className="space-y-2.5" aria-busy="true" aria-label="Loading jobs">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[84px] w-full" />)}
          </div>
        ) : shown.length === 0 ? (
          <StateCard kind="empty" title="No jobs here yet" detail={filter === "local" ? "Nothing in your preferred areas right now. Try All or Remote." : "Check back soon — new roles are posted every week."} />
        ) : (
          <m.ul initial="hidden" animate="shown" className="space-y-2.5">
            {(allJobs ? shown : shown.slice(0, 4)).map((j, i) => {
              const have = j.skills.filter((s) => mySkills.has(s.toLowerCase())).length;
              return (
                <m.li key={j.id} variants={rise} custom={i} className="relative">
                  <Link href={`/jobs/${j.id}`} className="flex items-center gap-3 rounded-tile bg-paper p-3 pr-14 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <CompanyMark name={j.company} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{j.title}</span>
                      <span className="block truncate text-[14px] text-paper-ink-muted">{j.company} · {j.remote ? "Remote" : j.location}</span>
                      <span className="block text-[13px] text-paper-ink-muted">
                        {j.employmentType} · {j.postedDaysAgo === 0 ? "Posted today" : `${j.postedDaysAgo} d ago`}
                        {profile && j.skills.length > 0 && <> · <span className="font-semibold text-success-on-paper">skills {have}/{j.skills.length}</span></>}
                      </span>
                    </span>
                  </Link>
                  <button type="button" onClick={() => toggleSave(j.id)} aria-pressed={saved.includes(j.id)} aria-label={`${saved.includes(j.id) ? "Saved" : "Save"} ${j.title} at ${j.company}`} className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-paper-ink">
                    <Bookmark className="size-5" strokeWidth={1.9} fill={saved.includes(j.id) ? "currentColor" : "none"} aria-hidden />
                  </button>
                </m.li>
              );
            })}
          </m.ul>
        )}
      </section>

      {!profile?.cameForJob && (
        <ButtonLink href="/identity/career" variant="outline" className="mt-6">Set up your career profile</ButtonLink>
      )}

      <figure className="relative -mx-5 mt-8 overflow-hidden px-5 py-6">
        <Sprout aria-hidden className="absolute -left-3 bottom-0 size-24 text-success/25" strokeWidth={1.25} />
        <blockquote className="ml-auto max-w-[240px] font-display-serif text-[21px] leading-snug">People. Work. A kinder neighbourhood.</blockquote>
      </figure>
    </AppShell>
  );
}
