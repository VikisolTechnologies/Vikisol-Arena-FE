"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Briefcase, CalendarDays, Check, ChevronRight, Copy, IndianRupee, Link2, ListChecks, MapPin, Rocket, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, rise } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, Panel, StatusPill } from "@/components/dash/Parts";
import { CandidateList } from "@/components/business/CandidateList";
import { NotSelectedSheet } from "@/components/business/NotSelectedSheet";
import { PipelineBoard, PopCount, useCanDrag } from "@/components/business/PipelineBoard";
import { getApplicantsForPosting, getMyEnterpriseProfile, getPosting, moveApplicantStage, setPostingStatus } from "@/lib/api/enterprise";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { STAGES, STAGE_TONE, jobParts, readJobExtras, type Applicant, type JobExtras } from "@/lib/data/business";
import { shortDate, timeAgo } from "@/lib/data/time";
import type { ApplicationStage, EnterpriseProfile, JobPosting } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "candidates", label: "Candidates" },
  { id: "activity", label: "Activity" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type View = "board" | "list";

const noop = () => () => {};

let early: { id: string; posting: ReturnType<typeof getPosting>; applicants: ReturnType<typeof getApplicantsForPosting> } | null = null;
if (typeof window !== "undefined") {
  const m = window.location.pathname.match(/^\/enterprise\/postings\/([^/]+)$/);
  if (m && m[1] !== "new") {
    const id = decodeURIComponent(m[1]);
    early = { id, posting: getPosting(id), applicants: getApplicantsForPosting(id) };
    early.posting.catch(() => {});
    early.applicants.catch(() => {});
  }
}
function requestsFor(id: string) {
  const e = early;
  early = null;
  if (e && e.id === id) return e;
  const applicants = getApplicantsForPosting(id);
  applicants.catch(() => {});
  return { posting: getPosting(id), applicants };
}

/** Recruiter board 4 (job page) + board 5 / flow §8 pipeline. Same getPosting / applicants /
 *  moveApplicantStage / setPostingStatus calls as before; Not selected always goes through the
 *  kind-message sheet, and "advance" never lands anyone in Not selected by accident. */
function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const canDrag = useCanDrag();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [posting, setPosting] = useState<JobPosting | null | undefined>(undefined);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [tab, setTab] = useState<Tab>(params.get("tab") === "candidates" ? "candidates" : "overview");
  const [view, setView] = useState<View | null>(null);
  const [rejecting, setRejecting] = useState<Applicant[]>([]);
  const [error, setError] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const extras = useSyncExternalStore<JobExtras | null>(noop, () => readJobExtrasCached(id), () => null);
  const published = params.get("published") === "1";

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    // Job and applicants in parallel (they only share the id), started when this route's code
    // arrived if the URL matched (see `early`): the job title is the page's main content.
    const { posting: postingRequest, applicants: applicantsRequest } = requestsFor(id);
    postingRequest
      .then((p) => {
        setPosting(p ?? null);
        if (!p) return;
        return applicantsRequest.then((as) => setApplicants(as.map((a) => ({ ...a, posting: p }))));
      })
      .catch(() => {
        setPosting((cur) => cur ?? null);
        setError("Applicants didn't load. Refresh to try again.");
      });
  }, [id, router]);

  const shell = (children: React.ReactNode) => <EnterpriseAppShell profile={profile}>{children}</EnterpriseAppShell>;
  if (posting === undefined) return shell(<div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-28" /><Skeleton className="h-64" /></div>);
  if (posting === null) return shell(<StateCard kind="empty" title="This job isn't available" detail="It may have been removed." action={<DashButton href="/enterprise/postings">Back to jobs</DashButton>} />);

  const parts = jobParts(posting.description);
  const list = applicants ?? [];
  const count = (s: ApplicationStage) => list.filter((a) => a.stage === s).length;
  const hrefFor = (a: Applicant) => `/enterprise/postings/${id}/candidates/${a.id}`;
  const activeView: View = view ?? (canDrag ? "board" : "list");

  const apply = async (people: Applicant[], stage: ApplicationStage) => {
    const ids = new Set(people.map((p) => p.id));
    const before = applicants;
    setError("");
    setApplicants((cur) => (cur ?? []).map((a) => (ids.has(a.id) ? { ...a, stage, updatedAt: new Date().toISOString() } : a)));
    const results = await Promise.allSettled(people.map((p) => moveApplicantStage(p.id, stage)));
    const failed = people.filter((_, i) => results[i].status === "rejected");
    if (failed.length) {
      const bad = new Set(failed.map((f) => f.id));
      setApplicants((cur) => (cur ?? []).map((a) => (bad.has(a.id) ? (before ?? []).find((b) => b.id === a.id) ?? a : a)));
      setError(`${failed.length === 1 ? "One move" : `${failed.length} moves`} didn't save. ${failed.length === 1 ? "It's" : "They're"} back where ${failed.length === 1 ? "it was" : "they were"}.`);
      if (stage === "rejected") throw new Error("move failed");
    }
  };
  const move = (a: Applicant, stage: ApplicationStage) => {
    if (stage === a.stage) return;
    if (stage === "rejected") setRejecting([a]);
    else void apply([a], stage);
  };
  const bulk = (people: Applicant[], stage: ApplicationStage) => {
    const moving = people.filter((p) => p.stage !== stage);
    if (!moving.length) return;
    if (stage === "rejected") setRejecting(moving);
    else void apply(moving, stage);
  };

  const changeStatus = async (status: JobPosting["status"]) => {
    setStatusBusy(true);
    setError("");
    try {
      await setPostingStatus(posting.id, status);
      setPosting({ ...posting, status });
    } catch {
      setError("The job status didn't change. Try again.");
    } finally {
      setStatusBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${posting.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy. The link is /jobs/" + posting.id);
    }
  };

  const nudge =
    count("interview") > 0
      ? { text: `${count("interview")} ${count("interview") === 1 ? "person is" : "people are"} ready for interview.`, go: () => { setTab("candidates"); setView("list"); } }
      : count("applied") > 0
        ? { text: `${count("applied")} new ${count("applied") === 1 ? "applicant" : "applicants"} to review.`, go: () => setTab("candidates") }
        : list.length === 0 && posting.status === "open"
          ? { text: "No applicants yet — share the link with local groups.", go: copy }
          : null;

  const details: [typeof MapPin, string][] = [
    [Briefcase, `${posting.title} · ${posting.employmentType}`],
    [MapPin, `${posting.location}${posting.remote ? " (Remote)" : " (On-site)"}`],
    [IndianRupee, posting.salaryMax ? `₹${posting.salaryMin}–${posting.salaryMax} LPA` : "Pay not set"],
    ...(parts.level ? [[ListChecks, parts.level] as [typeof MapPin, string]] : []),
    [CalendarDays, `Posted ${shortDate(posting.createdAt, true)}`],
    ...(extras?.deadline ? [[CalendarDays, `Application deadline: ${shortDate(extras.deadline, true)} (on this device)`] as [typeof MapPin, string]] : []),
    [Users, `${list.length} application${list.length === 1 ? "" : "s"}`],
  ];

  const events = [
    { at: posting.createdAt, text: "Job published" },
    ...list.map((a) => ({ at: a.appliedAt, text: `${a.candidate?.name ?? "Someone"} applied` })),
    ...list.filter((a) => a.updatedAt && a.updatedAt !== a.appliedAt).map((a) => ({ at: a.updatedAt, text: `${a.candidate?.name ?? "Someone"} moved to ${STAGES.find((s) => s.id === a.stage)?.label}` })),
  ].sort((x, y) => Date.parse(y.at) - Date.parse(x.at));

  return shell(
    <>
      <button type="button" onClick={() => router.push("/enterprise/postings")} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All jobs
      </button>
      <m.header initial="hidden" animate="shown" className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <m.div variants={rise} className="min-w-0 sm:flex-1">
          <h1 className="font-display-serif text-[30px] font-medium leading-tight lg:text-[38px]">{posting.title}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-faint">
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden /> {posting.location} · {posting.remote ? "Remote" : "On-site"}</span>
            {posting.salaryMax > 0 && <span className="inline-flex items-center gap-1"><IndianRupee className="size-4" aria-hidden /> {posting.salaryMin}–{posting.salaryMax} LPA</span>}
            <span>Posted {shortDate(posting.createdAt)}</span>
          </p>
        </m.div>
        <m.div variants={rise} custom={1} className="flex flex-wrap items-center gap-2">
          <StatusPill status={posting.status} />
          {posting.status !== "closed" && <DashButton variant="outline" disabled={statusBusy} onClick={() => changeStatus(posting.status === "open" ? "paused" : "open")}>{posting.status === "open" ? "Pause" : "Reopen"}</DashButton>}
          {posting.status !== "closed" && <DashButton variant="danger" disabled={statusBusy} onClick={() => changeStatus("closed")}>Close job</DashButton>}
        </m.div>
      </m.header>

      {published && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-tile bg-success/12 p-3.5 text-[15px]">
          <Rocket className="size-5 text-success-on-dark" aria-hidden /> Your job is live. Share the link to reach local people faster.
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}

      <div className="mt-5 max-w-[420px]"><Pills label="Job sections" options={TABS} value={tab} onChange={setTab} segmented /></div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="mt-5">
          {tab === "overview" && (
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-5">
                <ol aria-label="Applicants by stage" className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                  {STAGES.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => { setTab("candidates"); setView("list"); }} className={cn("flex w-full flex-col items-center rounded-2xl px-1 py-3 outline-none focus-visible:outline-2 focus-visible:outline-primary", STAGE_TONE[s.id])}>
                        <span className="font-display-serif text-[26px] font-medium leading-none sm:text-[32px]">{applicants ? <PopCount value={count(s.id)} /> : "–"}</span>
                        <span className="mt-1 text-[11px] font-semibold sm:text-[13px]">{s.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                {nudge && (
                  <button type="button" onClick={nudge.go} data-surface="paper" className="flex w-full items-center gap-4 rounded-tile bg-paper p-4 text-left text-paper-ink hover:bg-paper-muted">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary-on-paper"><Rocket className="size-6" aria-hidden /></span>
                    <span className="flex-1"><span className="block text-[16px] font-semibold">Keep it moving</span><span className="block text-[14px] text-faint">{nudge.text}</span></span>
                    <ChevronRight className="size-5 text-faint" aria-hidden />
                  </button>
                )}
                <Panel tone="paper" title="Job details">
                  <ul className="space-y-2.5">
                    {details.map(([Icon, text]) => (
                      <li key={text} className="flex items-start gap-3 text-[15px]"><Icon className="mt-0.5 size-4.5 shrink-0 text-faint" aria-hidden /> {text}</li>
                    ))}
                  </ul>
                  {parts.about && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-[15px] leading-relaxed text-foreground/85">{parts.about}</p>}
                  <p className="mt-4 text-[13px] text-faint">Editing a published job isn&apos;t available yet — close it and post again to change it.</p>
                </Panel>
              </div>
              <div className="space-y-5">
                <Panel title="Share your job" tone="paper">
                  <p className="text-[14px] text-paper-ink-muted">Copy the link for WhatsApp groups, notice boards and local channels.</p>
                  <button type="button" onClick={copy} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-paper-ink/25 bg-white px-4 text-[15px] font-semibold">
                    {copied ? <Check className="size-4 text-success-on-paper" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                    {copied ? "Copied" : "Copy link"}
                    {!copied && <Copy className="size-4 opacity-60" aria-hidden />}
                  </button>
                  <span role="status" className="sr-only">{copied ? "Link copied" : ""}</span>
                </Panel>
                {(parts.must.length > 0 || parts.nice.length > 0) && (
                  <Panel tone="paper" title="What you'll check">
                    {parts.must.length > 0 && (
                      <>
                        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-faint">Must-haves</h3>
                        <ul className="mt-1.5 space-y-1.5">{parts.must.map((x) => <li key={x} className="flex gap-2 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-success-on-dark" aria-hidden /> {x}</li>)}</ul>
                      </>
                    )}
                    {parts.nice.length > 0 && (
                      <>
                        <h3 className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-faint">Nice-to-haves</h3>
                        <ul className="mt-1.5 space-y-1.5">{parts.nice.map((x) => <li key={x} className="text-[15px] text-foreground/85">{x}</li>)}</ul>
                      </>
                    )}
                  </Panel>
                )}
                {extras?.questions?.length ? (
                  <Panel tone="paper" title="Application questions">
                    <ol className="list-decimal space-y-1.5 pl-5 text-[15px]">{extras.questions.map((q) => <li key={q}>{q}</li>)}</ol>
                    <p className="mt-3 text-[13px] text-faint">Saved on this device. Candidates aren&apos;t asked these until Arena supports questions.</p>
                  </Panel>
                ) : null}
              </div>
            </div>
          )}

          {tab === "candidates" && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="w-[220px]"><Pills label="View" options={[{ id: "board", label: "Board" }, { id: "list", label: "List" }] as const} value={activeView} onChange={setView} segmented /></div>
                <p className="text-[13px] text-faint">{activeView === "board" && canDrag ? "Drag a card to move it, or use its menu." : "Use a candidate's menu to move them to another stage, including Hired."}</p>
              </div>
              {!applicants ? (
                <Skeleton className="h-72" />
              ) : activeView === "board" ? (
                <PipelineBoard applicants={list} must={parts.must} hrefFor={hrefFor} onMove={move} />
              ) : (
                <CandidateList applicants={list} must={parts.must} hrefFor={hrefFor} onMove={move} onBulk={bulk} />
              )}
            </div>
          )}

          {tab === "activity" && (
            <Panel tone="paper" title="Activity">
              {events.length <= 1 && list.length === 0 ? (
                <p className="text-[14px] text-faint">Nothing yet beyond publishing. Applications and moves show up here.</p>
              ) : null}
              <ol className="relative mt-1 space-y-4 border-l border-line pl-5">
                {events.slice(0, 40).map((e, i) => (
                  <li key={`${e.at}-${i}`} className="relative">
                    <span className={cn("absolute -left-[26.5px] top-1.5 size-3 rounded-full border-2 border-background", i === 0 ? "bg-success" : "bg-foreground/30")} aria-hidden />
                    <p className="text-[15px] font-medium">{e.text}</p>
                    <p className="text-[13px] text-faint">{timeAgo(e.at)}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] text-faint">Built from application dates. The full audit trail (who moved whom) is in Company settings → Audit.</p>
            </Panel>
          )}
        </m.div>
      </AnimatePresence>

      <NotSelectedSheet
        people={rejecting}
        company={profile?.companyName ?? "our team"}
        onClose={() => setRejecting([])}
        onConfirm={async (people) => {
          await apply(people, "rejected");
          setRejecting([]);
        }}
      />
    </>,
  );
}

let extrasCache: { id: string; value: JobExtras } | null = null;
/** Stable snapshot for useSyncExternalStore (a fresh object each read would loop). */
function readJobExtrasCached(id: string): JobExtras {
  if (extrasCache?.id !== id) extrasCache = { id, value: readJobExtras(id) };
  return extrasCache.value;
}

export default function JobPostingPage() {
  return (
    <Suspense>
      <JobPage />
    </Suspense>
  );
}
