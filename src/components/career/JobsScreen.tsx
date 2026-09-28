"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { m } from "motion/react";
import { CircleCheck, Search, Users } from "lucide-react";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { getJobs } from "@/lib/api/jobs";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Job } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "local", label: "Local" },
  { id: "remote", label: "Remote" },
  { id: "onsite", label: "On-site" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function isLocal(j: Job, p: CandidateProfile | null) {
  const places = [p?.homeCity, ...(p?.preferredLocation ?? "").split(",")].map((x) => x?.trim().toLowerCase()).filter(Boolean) as string[];
  return !j.remote && places.some((x) => j.location.toLowerCase().includes(x));
}

/** Board "Open the career layer" #5 — Work → Jobs. No match percentages (flow §6 honesty). */
export function JobsScreen() {
  const router = useRouter();
  const published = useSearchParams().get("published") === "1";
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    getJobs()
      .then((j) => !cancelled && (setJobs(Array.isArray(j) ? j : []), setError(false)))
      .catch(() => !cancelled && setError(true));
    getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  const shown = useMemo(() => {
    const list = (jobs ?? []).filter((j) => filter === "all" || (filter === "remote" ? j.remote : filter === "onsite" ? !j.remote : isLocal(j, profile)));
    return [...list].sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }, [jobs, filter, profile]);
  const mySkills = new Set((profile?.skills ?? []).map((s) => s.name.toLowerCase()));

  return (
    <AppShell>
      <header className="flex items-start justify-between pt-3">
        <div>
          <h1 className="font-display-serif text-[34px] font-medium leading-tight">Jobs</h1>
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
      <div className="mt-4">
        <Pills label="Show" options={FILTERS} value={filter} onChange={setFilter} compact />
      </div>

      <section className="mt-5 flex-1" aria-label="Jobs near you">
        <SectionHeader title={filter === "remote" ? "Remote jobs" : "Jobs near you"} />
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
            {shown.map((j, i) => {
              const have = j.skills.filter((s) => mySkills.has(s.toLowerCase())).length;
              return (
                <m.li key={j.id} variants={rise} custom={i}>
                  <Link href={`/jobs/${j.id}`} className="flex items-center gap-3 rounded-tile bg-paper p-3 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
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
                </m.li>
              );
            })}
          </m.ul>
        )}
      </section>

      <section className="mt-7" aria-label="For you">
        <SectionHeader title="For you" />
        <Link href="/discover?show=activities" className="flex items-center gap-3 rounded-tile bg-surface p-4">
          <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary"><Users className="size-6" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">People. Work. A kinder neighbourhood.</span>
            <span className="block text-[14px] text-faint">Volunteer and community activities nearby</span>
          </span>
        </Link>
        {!profile?.cameForJob && (
          <ButtonLink href="/identity/career" variant="outline" className="mt-4">Set up your career profile</ButtonLink>
        )}
      </section>
    </AppShell>
  );
}
