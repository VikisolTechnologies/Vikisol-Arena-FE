"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, X } from "lucide-react";
import { vibrate } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { PreviewPill, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { CompanyMark } from "@/components/career/CompanyMark";
import { applyToJob } from "@/lib/api/applications";
import { getJob } from "@/lib/api/jobs";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import { JENNY_PREVIEW, readJobSearch, writeJobSearch } from "@/lib/data/jenny";
import { answer, careerValues, jobEvidence } from "@/lib/jenny/career";
import type { CandidateProfile, Job } from "@/lib/types";

const DRAFTS = "arena_jenny_application_drafts";
function readDraft(jobId: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(DRAFTS) ?? "{}") as Record<string, string>)[jobId] ?? null;
  } catch {
    return null;
  }
}
function saveDraft(jobId: string, message: string) {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFTS) ?? "{}") as Record<string, string>;
    localStorage.setItem(DRAFTS, JSON.stringify({ ...all, [jobId]: message }));
  } catch {
    /* storage blocked */
  }
}

/**
 * VNext "Jenny automates the outcome" #6 — Review application. Jenny prepared it; you see the job,
 * your answers, the resume, exactly what's shared and her note, then Approve & submit (the real
 * apply call) or Save draft. There is no path that submits without this tap.
 */
export function ReviewApplicationScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const jobId = params.get("job") ?? "";
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    Promise.all([getJob(jobId), getMyProfile()])
      .then(([j, p]) => {
        if (cancelled) return;
        setJob(j ?? null);
        setProfile(p);
        if (j) {
          const must = jobEvidence(j, p);
          const strengths = p.skills.map((s) => s.name).filter((s) => must.must.some((m) => m.toLowerCase() === s.toLowerCase())).slice(0, 2);
          setMessage(readDraft(j.id) ?? `I'm excited about this opportunity and believe my ${p.title ? p.title.toLowerCase() : ""} experience${strengths.length ? ` in ${strengths.join(" and ")}` : ""} aligns well with your team's work. I'd be glad to talk about how I can help.`.replace(/\s{2,}/g, " "));
        }
      })
      .catch(() => !cancelled && setJob(null));
    return () => {
      cancelled = true;
    };
  }, [jobId, router]);

  if (!JENNY_PREVIEW) {
    return (
      <AppShell tone="light">
        <div className="pt-10"><StateCard kind="empty" title="Apply from the job page" detail="Open the role and tap Apply — you'll see exactly what's shared." action={<ButtonLink href={jobId ? `/jobs/${jobId}` : "/jobs"}>Open the job</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const submit = async () => {
    if (!job || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const a = await applyToJob(job.id);
      const r = readJobSearch();
      writeJobSearch({ ...r, submitted: [...new Set([...r.submitted, a.id])] });
      saveDraft(job.id, message);
      vibrate();
      router.replace(`/applications/${a.id}`);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "It didn't go through. Nothing was submitted — try again.");
      busyRef.current = false;
      setBusy(false);
    }
  };

  const v = profile ? careerValues(profile) : {};
  const answers: [string, string][] = [
    ["Experience", answer(v, "years") || "Not added"],
    ["Work mode", answer(v, "modes") || "Not added"],
    ["Compensation", answer(v, "expected") || "Not added"],
    ["Notice period", answer(v, "notice") || "Not added"],
  ];
  const shared = profile ? [`Name (${profile.name})`, profile.title ? `Headline (${profile.title})` : "Headline", "Experience and skills", profile.resumeFileName ? "Resume" : null].filter((x): x is string => !!x) : [];

  return (
    <AppShell tone="light">
      <div className="-mx-5 -mt-[max(8px,env(safe-area-inset-top))] flex-1 px-5 pb-6 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display-serif text-[30px] font-medium">Review application</h1>
          <button type="button" onClick={() => router.back()} aria-label="Close" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-paper-muted">
            <X className="size-6" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        {job === undefined || (job && !profile) ? (
          <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading"><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : !job || !profile ? (
          <div className="pt-8"><StateCard kind="empty" title="This role isn't listed any more" detail="Nothing was submitted." action={<ButtonLink href="/identity/career/shortlist">Back to shortlist</ButtonLink>} /></div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3">
              <CompanyMark name={job.company} className="size-14 text-[20px]" />
              <div className="min-w-0">
                <p className="text-[19px] font-semibold leading-snug">{job.title}</p>
                <p className="text-[14px] text-paper-ink-muted">{job.company}</p>
                <p className="text-[14px] text-paper-ink-muted">{[job.location.split(",")[0], job.remote ? "Remote" : null].filter(Boolean).join(" · ")}</p>
              </div>
              <PreviewPill className="ml-auto self-start" />
            </div>

            <Section title="Your answers" edit="/identity/career?step=setup" note="Ready if they ask — Arena can't send answers with an application yet.">
              <dl className="space-y-1.5 text-[15px]">
                {answers.map(([k, val]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                    <dt className="text-paper-ink-muted">{k}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <Section title="Resume" edit="/identity/career?step=setup">
              {profile.resumeFileName ? (
                <p className="flex items-center gap-3 rounded-xl bg-paper-muted p-3 text-[15px]"><FileText className="size-6 shrink-0" strokeWidth={1.75} aria-hidden /> {profile.resumeFileName}</p>
              ) : (
                <p className="text-[15px] text-paper-ink-muted">No resume yet — you can apply without one.</p>
              )}
            </Section>

            <Section title="Data to be shared" edit="/identity/career/jenny?step=privacy">
              <p className="text-[15px]">{shared.join(", ")}.</p>
              <p className="mt-1 text-[13px] text-paper-ink-muted">Only {job.company} sees this, and only once you submit. Your pay and notice period stay private.</p>
            </Section>

            <Section title="Message to employer" action={<button type="button" onClick={() => setEditing((e) => !e)} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper">{editing ? "Done" : "Edit"}</button>} note="Drafted by Jenny. Arena can't attach a note to an application yet — it's kept here for when they reply.">
              {editing ? (
                <>
                  <label htmlFor="employer-note" className="sr-only">Message to employer</label>
                  <textarea id="employer-note" value={message} maxLength={600} rows={5} onChange={(e) => setMessage(e.target.value)} className="w-full rounded-xl border border-field-line bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-primary-on-paper" />
                </>
              ) : (
                <p className="rounded-xl bg-paper-muted p-3 text-[15px] leading-relaxed">{message}</p>
              )}
            </Section>

            {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <div className="mt-6 grid grid-cols-[2fr_3fr] gap-3">
              <Button variant="outline" className="border-paper-ink/55 text-paper-ink" success={saved} onClick={() => (saveDraft(job.id, message), setSaved(true), setTimeout(() => setSaved(false), 1400))}>Save draft</Button>
              <Button loading={busy} onClick={submit}>Approve &amp; submit</Button>
            </div>
            <p className="mt-2 text-center text-[13px] text-paper-ink-muted">Submitting sends your application to {job.company}. You can withdraw it later.</p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, edit, action, note, children }: { title: string; edit?: string; action?: ReactNode; note?: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-tile bg-surface p-4 ring-1 ring-paper-ink/10" aria-label={title}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {action ?? (edit && <Link href={edit} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper">Edit</Link>)}
      </div>
      {children}
      {note && <p className="mt-2 text-[13px] text-paper-ink-muted">{note}</p>}
    </section>
  );
}
