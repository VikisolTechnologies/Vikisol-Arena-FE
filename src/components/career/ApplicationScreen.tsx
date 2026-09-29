"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, CalendarCheck2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { getMyApplications, withdrawApplication } from "@/lib/api/applications";
import { getJob } from "@/lib/api/jobs";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { Application, ApplicationStage, CandidateProfile, Job } from "@/lib/types";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { useJobSearch } from "@/components/jenny/useJenny";
import { JENNY_PREVIEW } from "@/lib/data/jenny";

const STEPS: { stage: ApplicationStage; title: string; detail: string }[] = [
  { stage: "applied", title: "Application submitted", detail: "" },
  { stage: "screening", title: "Under review", detail: "We'll tell you about next steps." },
  { stage: "interview", title: "Interview", detail: "Pick a slot when they send times." },
  { stage: "offer", title: "Offer", detail: "Review it with the employer." },
  { stage: "hired", title: "Hired", detail: "Congratulations — you're on the team." },
];
const ORDER: ApplicationStage[] = ["applied", "screening", "interview", "offer", "hired"];

export interface ApplicationSpecimen {
  application: Application;
  job: Job;
  /** Compare page: as if submitted from Jenny's "Review application". */
  viaJenny?: boolean;
}

/** Board "Open the career layer" #7 — Apply & track. Status only from the real stage. */
export function ApplicationScreen({ id, specimen }: { id: string; specimen?: ApplicationSpecimen }) {
  const router = useRouter();
  const [app, setApp] = useState<Application | null | undefined>(specimen?.application);
  const [job, setJob] = useState<Job | null | undefined>(specimen?.job);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Submitted from Jenny's "Review application" (P8 "Track outcome"): she says she's keeping watch.
  const jobSearch = useJobSearch();

  useEffect(() => {
    if (specimen || !requireOnboarded(router)) return;
    let cancelled = false;
    getMyApplications()
      .then(async (apps) => {
        const found = (Array.isArray(apps) ? apps : []).find((a) => a.id === id) ?? null;
        if (cancelled) return;
        setApp(found);
        setJob(found?.jobId ? ((await getJob(found.jobId)) ?? null) : null);
      })
      .catch(() => !cancelled && setApp(null));
    getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, router, specimen]);

  if (app === undefined || (app && job === undefined)) {
    return (
      <AppShell tone="light">
        <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading your application">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }
  if (!app) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="empty" title="This application isn't here any more" detail="It may have been withdrawn." action={<ButtonLink href="/work">Go to Work</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const rejected = app.stage === "rejected";
  const reached = rejected ? -1 : ORDER.indexOf(app.stage);
  const viaJenny = JENNY_PREVIEW && (!!specimen?.viaJenny || !!jobSearch?.submitted.includes(app.id));
  const applied = new Date(app.appliedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <AppShell tone="light">
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
            <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
          </button>
          <h1 className="font-display-serif text-[26px] font-medium">My application</h1>
        </div>

        {job ? (
          <Link href={`/jobs/${job.id}`} className="mt-3 flex items-center gap-3 rounded-tile bg-paper-muted p-3.5 ring-1 ring-paper-ink/10">
            <CompanyMark name={job.company} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold">{job.title}</span>
              <span className="block truncate text-[14px] text-paper-ink-muted">{job.company} · {job.remote ? "Remote" : job.location}</span>
              <span className="block text-[13px] text-paper-ink-muted">Applied on {applied}</span>
            </span>
          </Link>
        ) : (
          <p className="mt-3 rounded-tile bg-white p-4 text-[15px] ring-1 ring-paper-ink/10">This role is no longer listed, but your application is still on record.</p>
        )}

        <m.ol key={app.stage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={dissolve} className="mt-6 space-y-5" aria-label="Application status">
          {STEPS.map((s, i) => {
            const done = i < reached || (i === reached && i === 0);
            const now = i === reached && i !== 0;
            return (
              <li key={s.stage} className="relative flex gap-4">
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="absolute left-[11px] top-7 h-[calc(100%-2px)] w-0.5 bg-paper-ink/15">
                    <m.span className="block h-full w-full origin-top bg-primary" initial={false} animate={{ scaleY: i < reached ? 1 : 0 }} transition={spring.gentle} />
                  </span>
                )}
                <span aria-hidden className={cn("relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2", done || now ? "border-primary bg-primary" : "border-paper-ink/25 bg-paper")}>
                  {(done || now) && <span className="size-2 rounded-full bg-white" />}
                </span>
                <div>
                  <p className={cn("text-[16px]", done || now ? "font-semibold" : "text-paper-ink-muted")}>
                    {s.title}
                    <span className="sr-only">{done ? " — done" : now ? " — current step" : " — not yet"}</span>
                  </p>
                  <p className="text-[14px] text-paper-ink-muted">{i === 0 ? (viaJenny ? `${applied} (as approved by you)` : applied) : s.detail}</p>
                </div>
              </li>
            );
          })}
          {rejected && (
            <li className="rounded-tile bg-paper-muted p-4 text-[15px]">
              <p className="font-semibold">Not selected this time</p>
              <p className="mt-1 text-paper-ink-muted">Thank you for applying. Your profile stays yours — keep exploring roles near you.</p>
            </li>
          )}
        </m.ol>

        {viaJenny && !rejected && (
          <m.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={dissolve} aria-label="Jenny" className="mt-6 flex gap-3 rounded-tile bg-white p-4 ring-1 ring-paper-ink/10">
            <JennyOrb size={40} online={false} still />
            <div>
              <p className="text-[15px] font-semibold">Jenny</p>
              <p className="mt-0.5 text-[15px] leading-relaxed">Your application is in. I&apos;ll keep an eye on the response and tell you when something changes. You&apos;ll always approve the next steps.</p>
              <p className="mt-2 text-[13px] text-paper-ink-muted">If there&apos;s no reply in 3 days, I&apos;ll draft a follow-up for you to review — nothing is sent without you.</p>
            </div>
          </m.section>
        )}

        {app.stage === "interview" && (
          <ButtonLink href={`/interviews/${app.id}`} className="mt-6"><CalendarCheck2 className="size-5" aria-hidden /> Open interview</ButtonLink>
        )}

        <section className="mt-6 rounded-tile bg-white p-4 ring-1 ring-paper-ink/10" aria-label="What you shared">
          <p className="text-[15px] font-semibold">What you shared</p>
          <p className="mt-1 flex items-center gap-2 text-[14px] text-paper-ink-muted"><FileText className="size-4" aria-hidden /> {profile?.resumeFileName ? `Resume: ${profile.resumeFileName}` : "Your profile (no resume)"}</p>
        </section>

        {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
        {/* Only the candidate's own, still-open application can be withdrawn (this screen loads
            only their own applications); a hire or a decision is final here. */}
        {!rejected && app.stage !== "hired" && (
          <Button variant="outline" className="mt-6 border-paper-ink/55 text-paper-ink" onClick={() => setWithdrawOpen(true)}>Withdraw application</Button>
        )}
      </div>

      <BottomSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw application">
        <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Withdraw this application?</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">{job?.company ?? "The employer"} won&apos;t see it any more. You can apply again later if the role is still open.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={() => setWithdrawOpen(false)}>Keep it</Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await withdrawApplication(app.id);
                router.replace("/work");
              } catch (err) {
                setError(err instanceof Error ? err.message : "That didn't go through. Your application is still active.");
                setWithdrawOpen(false);
                setBusy(false);
              }
            }}
          >
            Withdraw
          </Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
