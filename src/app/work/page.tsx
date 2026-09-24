"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Compass, Building2, Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { getJobs, getJob } from "@/lib/api/jobs";
import { getProjects, getProject } from "@/lib/api/market";
import { getMyBids } from "@/lib/api/myBids";
import { getMyApplications } from "@/lib/api/applications";
import { getInterviewForApplication } from "@/lib/api/interviews";
import { getPosting } from "@/lib/api/enterprise";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { formatFriendlyDateTime, formatINRRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Job, Project } from "@/lib/types";

// Work: the one home for jobs and bidding (Arena restructure, Phase 1). Replaces the old
// "What you're in" page + list of links out to Discover/Marketplace/Companies - those are still
// real pages, reachable from here, but a visitor no longer has to know which of four places
// holds the thing they want.
type Tab = "jobs" | "bidding" | "mine";
const TABS: { key: Tab; label: string }[] = [
  { key: "jobs", label: "Jobs" },
  { key: "bidding", label: "Bidding" },
  { key: "mine", label: "Mine" },
];

interface ActiveItem {
  id: string;
  title: string;
  state: string;
  pill?: string;
  href: string;
}

function hoursLeft(endsAt: string) {
  return Math.max(0, Math.round((new Date(endsAt).getTime() - Date.now()) / 3_600_000));
}

function Row({ href, title, sub, trailing }: { href: string; title: string; sub: string; trailing?: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-secondary"
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{sub}</p>
      </div>
      {trailing}
    </Link>
  );
}

export default function WorkPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("jobs");
  const [signedIn, setSignedIn] = useState(false);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [mine, setMine] = useState<ActiveItem[] | null>(null);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  useEffect(() => {
    // ?tab=bidding / ?tab=mine deep links (read once, client-only).
    const requested = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only URL read
    if (requested === "bidding" || requested === "mine") setTab(requested);
    setSignedIn(!!getSession());
  }, []);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    getJobs()
      .then((j) => setJobs(j.slice().sort((a, b) => b.matchPercentage - a.matchPercentage || a.postedDaysAgo - b.postedDaysAgo)))
      .catch(() => setJobs([]));
    getProjects()
      .then((p) => setProjects(p.filter((x) => x.status === "open")))
      .catch(() => setProjects([]));
  }, [router]);

  // "Mine" = things you're actively in: live bids and interviews with a real slot. Joined
  // activity rooms live in Inbox now, so they're not repeated here.
  useEffect(() => {
    if (tab !== "mine" || mine !== null || !getSession()) return;
    (async () => {
      const [bids, apps] = await Promise.all([getMyBids().catch(() => []), getMyApplications().catch(() => [])]);
      const bidItems = await Promise.all(
        bids
          .filter((b) => b.status === "pending" || b.status === "shortlisted")
          .map(async (b): Promise<ActiveItem> => {
            const project = await getProject(b.projectId);
            return {
              id: `bid-${b.bidId}`,
              title: project?.title ?? "Project",
              state: `Your bid: ₹${b.amount.toLocaleString("en-IN")}`,
              pill: b.status === "shortlisted" ? "Shortlisted" : "Pending",
              href: `/marketplace/${b.projectId}`,
            };
          }),
      );
      const interviewItems = (
        await Promise.all(
          apps
            .filter((a) => a.stage === "interview")
            .slice(0, 10)
            .map(async (a): Promise<ActiveItem | null> => {
              const interview = await getInterviewForApplication(a.id);
              if (!interview || (interview.status !== "proposed" && interview.status !== "confirmed")) return null;
              const posting = a.jobId ? await getJob(a.jobId) : a.postingId ? await getPosting(a.postingId) : undefined;
              const slot = interview.confirmedSlotId ? interview.proposedSlots.find((s) => s.id === interview.confirmedSlotId) : undefined;
              return {
                id: `int-${a.id}`,
                title: posting?.title ?? "Interview",
                state: slot ? formatFriendlyDateTime(slot.start) : "Pick a time",
                pill: interview.status === "confirmed" ? "Interview" : "Choose slot",
                href: `/interviews/${a.id}`,
              };
            }),
        )
      ).filter((x): x is ActiveItem => x !== null);
      setMine([...interviewItems, ...bidItems]);
    })();
  }, [tab, mine]);

  function postProject() {
    if (!signedIn) {
      setSignInPromptOpen(true);
      return;
    }
    router.push("/marketplace?post=1");
  }

  return (
    <AppShell title="Work">
      <div className="mx-auto w-full max-w-[780px]">
        <div role="tablist" aria-label="Work" className="mb-5 flex gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                tab === t.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "jobs" && (
          <section aria-label="Jobs">
            <div className="mb-4 flex flex-wrap gap-2">
              <Link href="/discover" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                <Compass className="size-3.5" /> Swipe through matches
              </Link>
              <Link href="/companies" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                <Building2 className="size-3.5" /> Companies
              </Link>
            </div>
            {jobs === null ? (
              <OrbLoader className="h-48" />
            ) : jobs.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No open roles right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{jobs.length} open roles</p>
                {jobs.map((job) => (
                  <Row
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    title={job.title}
                    sub={`${job.company} · ${job.remote ? "Remote" : job.location} · ₹${job.salaryMin}–${job.salaryMax}L`}
                    trailing={
                      job.matchPercentage > 0 ? (
                        <span className="shrink-0 text-[12px] font-bold text-foreground">{job.matchPercentage}% match</span>
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "bidding" && (
          <section aria-label="Bidding">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">Freelance projects open for bids.</p>
              <Button size="sm" className="gap-1.5" onClick={postProject}>
                <Plus className="size-3.5" /> Post a project
              </Button>
            </div>
            {projects === null ? (
              <OrbLoader className="h-48" />
            ) : projects.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No projects open for bids right now.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {projects.map((p) => (
                  <Row
                    key={p.id}
                    href={`/marketplace/${p.id}`}
                    title={p.title}
                    sub={`${formatINRRange(p.budgetMin, p.budgetMax)} · ${p.durationWeeks} weeks · ${hoursLeft(p.endsAt)}h left`}
                    trailing={
                      <span className="shrink-0 text-[12px] font-bold text-foreground">
                        {p.bids.length} bid{p.bids.length === 1 ? "" : "s"}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "mine" && (
          <section aria-label="Mine">
            {!signedIn ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
                <p className="mb-2 text-[15px] font-medium">Your applications and bids live here</p>
                <p className="mb-5 text-[13px] text-muted-foreground">Sign in to track interviews, bids and everything you&apos;ve applied to.</p>
                <Button size="sm" render={<Link href="/auth" />} nativeButton={false}>
                  Sign in
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Link href="/applications" className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                    All applications
                  </Link>
                  <Link href="/marketplace/bids" className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                    All my bids
                  </Link>
                </div>
                {mine === null ? (
                  <OrbLoader className="h-48" />
                ) : mine.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center">
                    <p className="mb-2 text-[15px] font-medium">Nothing in progress</p>
                    <p className="text-[13px] text-muted-foreground">Apply to a role or bid on a project and it&apos;ll show up here.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {mine.map((item) => (
                      <Row
                        key={item.id}
                        href={item.href}
                        title={item.title}
                        sub={item.state}
                        trailing={
                          item.pill && (
                            <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                              {item.pill}
                            </span>
                          )
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="post a project" />
    </AppShell>
  );
}
