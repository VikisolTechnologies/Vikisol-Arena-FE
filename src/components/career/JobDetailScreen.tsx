"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, Briefcase, Check, CircleCheck, CircleDashed, Clock, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise, vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { SuccessCheck } from "@/components/activity/ActivityParts";
import { Burst } from "@/components/bplus/Burst";
import { CompanyMark } from "@/components/career/CompanyMark";
import { getJob } from "@/lib/api/jobs";
import { applyToJob, getMyApplications } from "@/lib/api/applications";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatINRRange } from "@/lib/format";
import type { Application, CandidateProfile, Job } from "@/lib/types";

/** Board "Open the career layer" #6 — Job details, and the Apply sheet from flow §6. */
export function JobDetailScreen({ id, specimen }: { id: string; specimen?: { job: Job; profile: CandidateProfile; applyOpen?: boolean } }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null | undefined>(specimen?.job);
  const [profile, setProfile] = useState<CandidateProfile | null>(specimen?.profile ?? null);
  const [application, setApplication] = useState<Application | null>(null);
  const [tab, setTab] = useState<"about" | "fit">("about");
  const [applyOpen, setApplyOpen] = useState(!!specimen?.applyOpen);

  useEffect(() => {
    if (specimen || !requireOnboarded(router)) return;
    let cancelled = false;
    getJob(id).then((j) => !cancelled && setJob(j ?? null)).catch(() => !cancelled && setJob(null));
    getMyProfile().then((p) => !cancelled && setProfile(p)).catch(() => {});
    getMyApplications().then((apps) => !cancelled && setApplication((Array.isArray(apps) ? apps : []).find((a) => a.jobId === id) ?? null)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, router, specimen]);

  if (job === undefined) {
    return (
      <AppShell>
        <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading the job">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }
  if (job === null) {
    return (
      <AppShell>
        <div className="pt-10"><StateCard kind="empty" title="This job isn't available any more" detail="It may have been filled or closed." action={<ButtonLink href="/jobs">See other jobs</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const mine = new Set((profile?.skills ?? []).map((s) => s.name.toLowerCase()));
  const shown = job.skills.filter((s) => mine.has(s.toLowerCase()));

  return (
    <AppShell>
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 bg-paper px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))] text-paper-ink">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <m.div initial="hidden" animate="shown">
          <m.h1 variants={rise} custom={0} className="mt-1 font-display-serif text-[28px] font-medium leading-tight">{job.title}</m.h1>
          <m.div variants={rise} custom={1} className="mt-4 flex items-center gap-3 rounded-tile bg-white p-3.5 ring-1 ring-paper-ink/10">
            <CompanyMark name={job.company} className="size-14 text-[20px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold">{job.company}</p>
              <p className="flex items-center gap-1 text-[14px] text-paper-ink-muted"><MapPin className="size-3.5" aria-hidden /> {job.remote ? "Remote" : job.location}</p>
              <p className="text-[14px] text-paper-ink-muted">{job.employmentType}</p>
            </div>
          </m.div>
          <m.dl variants={rise} custom={2} className="mt-3 grid grid-cols-3 gap-2 text-center text-[13px]">
            <div className="rounded-xl bg-paper-muted p-2.5"><dt className="sr-only">Mode</dt><dd className="flex flex-col items-center gap-1"><Briefcase className="size-4" aria-hidden />{job.remote ? "Remote" : "On-site"}</dd></div>
            <div className="rounded-xl bg-paper-muted p-2.5"><dt className="sr-only">Pay</dt><dd className="flex flex-col items-center gap-1"><IndianRupee className="size-4" aria-hidden />{job.salaryMax ? formatINRRange(job.salaryMin, job.salaryMax, "LPA") : "Not stated"}</dd></div>
            <div className="rounded-xl bg-paper-muted p-2.5"><dt className="sr-only">Posted</dt><dd className="flex flex-col items-center gap-1"><Clock className="size-4" aria-hidden />{job.postedDaysAgo === 0 ? "Today" : `${job.postedDaysAgo} d ago`}</dd></div>
          </m.dl>
        </m.div>

        <div className="mt-5">
          <Pills label="Job" tone="orange" segmented onPaper options={[{ id: "about", label: "About" }, { id: "fit", label: "Your fit" }]} value={tab} onChange={setTab} />
        </div>
        {tab === "about" ? (
          <section className="mt-5" aria-label="About the role">
            <h2 className="text-[18px] font-semibold">About the role</h2>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{job.description}</p>
            {job.skills.length > 0 && (
              <>
                <h2 className="mt-5 text-[18px] font-semibold">Skills they ask for</h2>
                <ul className="mt-2 space-y-1.5 text-[15px]">
                  {job.skills.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      {mine.has(s.toLowerCase()) ? <CircleCheck className="size-4 text-success-on-paper" aria-label="On your profile" /> : <CircleDashed className="size-4 text-paper-ink-muted" aria-label="Not on your profile yet" />}
                      {s}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ) : (
          <section className="mt-5" aria-label="Your fit">
            <p className="text-[16px]"><strong className="font-semibold">{shown.length} of {job.skills.length}</strong> skills they ask for are on your profile.</p>
            <p className="mt-1 text-[14px] text-paper-ink-muted">Evidence only — Arena doesn&apos;t score you with a match percentage.</p>
            <Link href={`/agent?about=${job.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-primary-on-paper underline underline-offset-4">
              <Sparkles className="size-4" aria-hidden /> Ask Jenny about this role
            </Link>
          </section>
        )}

        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-5 mt-6 bg-linear-to-t from-paper from-80% to-transparent px-5 pb-2 pt-4">
          {application ? (
            <ButtonLink href={`/applications/${application.id}`} variant="outline" className="border-paper-ink/55 text-paper-ink">You applied — see status</ButtonLink>
          ) : (
            <Button onClick={() => setApplyOpen(true)}>Apply</Button>
          )}
        </div>
      </div>
      <ApplySheet open={applyOpen} onClose={() => setApplyOpen(false)} job={job} profile={profile} onApplied={setApplication} />
    </AppShell>
  );
}

/** Flow §6 Apply: exactly what's shared, resume, consent. Screening questions, a cover note and
 *  CTC sharing wait for the API (FE-API-GAPS #20) — nothing is collected that can't be sent. */
function ApplySheet({ open, onClose, job, profile, onApplied }: { open: boolean; onClose: () => void; job: Job; profile: CandidateProfile | null; onApplied: (a: Application) => void }) {
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Application | null>(null);
  const submit = async () => {
    setTried(true);
    if (!consent) return;
    setBusy(true);
    setError("");
    try {
      const a = await applyToJob(job.id);
      vibrate();
      setDone(a);
      onApplied(a);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Your application didn't send. Nothing was shared — try again.");
    } finally {
      setBusy(false);
    }
  };
  const shared = [profile?.name ? `Your name (${profile.name})` : "Your name", profile?.title ? `Title: ${profile.title}` : "Your title", "Skills and experience", profile?.resumeFileName ? `Resume: ${profile.resumeFileName}` : "No resume — you can apply without one"];
  return (
    <BottomSheet open={open} onClose={onClose} title={`Apply to ${job.title}`}>
      {done ? (
        <div className="pt-4 text-center">
          <div className="relative mx-auto w-fit">
            <SuccessCheck />
            <Burst count={14} radius={72} />
          </div>
          <h2 className="mt-4 font-display-serif text-[28px] font-medium">Application sent</h2>
          <p className="mt-1 text-[15px] text-paper-ink-muted">{job.company} will review it. You&apos;ll see every step here.</p>
          <ButtonLink href={`/applications/${done.id}`} className="mt-6">Track my application</ButtonLink>
        </div>
      ) : (
        <div>
          <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium leading-tight">Apply to {job.title}</h2>
          <p className="mt-1 text-[15px] text-paper-ink-muted">{job.company}</p>
          <section className="mt-5 rounded-tile bg-paper-muted p-4" aria-label="What will be shared">
            <p className="text-[15px] font-semibold">Exactly what {job.company} will see</p>
            <ul className="mt-2 space-y-1.5 text-[14px]">
              {shared.map((s) => (
                <li key={s} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success-on-paper" aria-hidden /> {s}</li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-paper-ink-muted">Not shared: your pay, current company, exact location or anything marked &ldquo;Only me&rdquo;.</p>
          </section>
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-[15px]">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", consent ? "border-primary-on-paper bg-primary-on-paper text-white" : tried ? "border-danger-on-paper bg-white" : "border-field-line bg-white")}>
              {consent && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            I agree to share these details with {job.company} for this application.
          </label>
          {tried && !consent && <p className="mt-1 text-[13px] text-danger-on-paper">Tick to agree before applying.</p>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          <Button className="mt-5" loading={busy} onClick={submit}>Send application</Button>
        </div>
      )}
    </BottomSheet>
  );
}
