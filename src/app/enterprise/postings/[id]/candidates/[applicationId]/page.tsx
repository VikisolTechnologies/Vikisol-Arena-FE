"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Briefcase, CalendarDays, Check, CheckCircle2, Circle, CircleDashed, FileText, IndianRupee, Lock, MapPin, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, rise } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, Panel } from "@/components/dash/Parts";
import { NotSelectedSheet } from "@/components/business/NotSelectedSheet";
import { getApplicantsForPosting, getCandidateDetail, getMyEnterpriseProfile, getPosting, moveApplicantStage } from "@/lib/api/enterprise";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { STAGES, STAGE_LABEL, STAGE_TONE, addNote, evidenceFor, jobParts, readNotes, type Applicant, type Evidence, type RecruiterNote } from "@/lib/data/business";
import { shortDate, timeAgo } from "@/lib/data/time";
import type { ApplicationStage, CandidateProfile, EnterpriseProfile } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "resume", label: "Resume" },
  { id: "evidence", label: "Evidence" },
  { id: "notes", label: "Notes" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const NEXT: Partial<Record<ApplicationStage, { stage: ApplicationStage; label: string }>> = {
  applied: { stage: "screening", label: "Start reviewing" },
  screening: { stage: "interview", label: "Move to interview" },
  interview: { stage: "offer", label: "Move to offer" },
};

function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items.length) return <p className="text-[14px] text-faint">This job has no must-haves listed.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((e) => (
        <li key={e.item} className="flex items-start gap-3 text-[15px]">
          {e.state === "shown" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-on-dark" aria-hidden /> : e.state === "partial" ? <CircleDashed className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden /> : <Circle className="mt-0.5 size-5 shrink-0 text-faint" aria-hidden />}
          <span>
            {e.item} <span className="text-faint">— {e.state === "shown" ? `Shown (${e.source})` : e.state === "partial" ? `Partly shown (${e.source})` : "Not shown"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Recruiter board 6 — Candidate profile: consented information only, must-have evidence,
 *  resume, team-private notes (device-only until the API stores them, gap #30). */
export default function CandidateProfilePage() {
  const { id, applicationId } = useParams<{ id: string; applicationId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [app, setApp] = useState<Applicant | null | undefined>(undefined);
  const [detail, setDetail] = useState<CandidateProfile | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [notes, setNotes] = useState<RecruiterNote[]>(() => (typeof window === "undefined" ? [] : readNotes(applicationId)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    Promise.all([getPosting(id), getApplicantsForPosting(id)])
      .then(([p, as]) => {
        const a = p ? as.find((x) => x.id === applicationId) : undefined;
        setApp(a && p ? { ...a, posting: p } : null);
        if (a) getCandidateDetail(a.candidateId).then(setDetail).catch(() => {});
      })
      .catch(() => setApp(null));
  }, [id, applicationId, router]);

  const shell = (children: React.ReactNode) => <EnterpriseAppShell profile={profile}>{children}</EnterpriseAppShell>;
  if (app === undefined) return shell(<div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>);
  if (app === null) return shell(<StateCard kind="empty" title="This application isn't available" detail="It may have been withdrawn." action={<DashButton href={`/enterprise/postings/${id}`}>Back to the job</DashButton>} />);

  const c = { ...(app.candidate ?? {}), ...(detail ?? {}) } as Partial<CandidateProfile>;
  const name = c.name ?? "Candidate";
  const must = jobParts(app.posting.description).must;
  const evidence = evidenceFor(must, c as CandidateProfile);
  const shown = evidence.filter((e) => e.state === "shown").length;
  const next = NEXT[app.stage];

  const move = async (stage: ApplicationStage) => {
    setBusy(true);
    setError("");
    try {
      await moveApplicantStage(app.id, stage);
      setApp({ ...app, stage, updatedAt: new Date().toISOString() });
    } catch {
      setError("That didn't save. Try again.");
      throw new Error("move failed");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = () => {
    const t = note.trim();
    if (!t) return;
    setNotes(addNote(app.id, t));
    setNote("");
  };

  const info: [typeof MapPin, string][] = [
    ...(c.location || c.homeCity ? [[MapPin, `Based in ${c.location || c.homeCity}`] as [typeof MapPin, string]] : []),
    [Wifi, c.remote ? "Open to remote work" : "Open to on-site work"],
    ...(c.experienceYears != null ? [[Briefcase, `${c.experienceYears} year${c.experienceYears === 1 ? "" : "s"} of experience`] as [typeof MapPin, string]] : []),
    ...(c.expectedCtc ? [[IndianRupee, `Expects ₹${c.expectedCtc} LPA`] as [typeof MapPin, string]] : []),
    ...(c.openTo?.length ? [[CalendarDays, `Open to ${c.openTo.join(", ").replace("full-time", "full time")}`] as [typeof MapPin, string]] : []),
  ];

  const actions = (
    <div className="flex flex-wrap gap-2">
      {app.stage !== "rejected" && <DashButton variant="danger" disabled={busy} onClick={() => setRejecting(true)}>Not selected</DashButton>}
      {app.stage === "interview" && <DashButton href={`/enterprise/interviews/${app.id}`} variant="outline">Open interview</DashButton>}
      {next && <DashButton disabled={busy} onClick={() => move(next.stage).catch(() => {})}>{next.label}</DashButton>}
      {app.stage === "rejected" && <DashButton variant="outline" disabled={busy} onClick={() => move("screening").catch(() => {})}>Reconsider</DashButton>}
    </div>
  );

  return shell(
    <>
      <button type="button" onClick={() => router.push(`/enterprise/postings/${id}?tab=candidates`)} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {app.posting.title}
      </button>
      <m.div initial="hidden" animate="shown" className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <m.header variants={rise} className="flex flex-wrap items-center gap-4">
            <Avatar name={name} className="size-20 text-[24px]" />
            <div className="min-w-0 flex-1">
              <h1 className="font-display-serif text-[30px] font-medium leading-tight">{name}</h1>
              <p className="text-[14px] text-faint">{c.title ? `${c.title} · ` : ""}Applied {shortDate(app.appliedAt, true)}</p>
              <span className={cn("mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold", STAGE_TONE[app.stage])}>{STAGE_LABEL[app.stage]}</span>
            </div>
          </m.header>
          <m.p variants={rise} custom={1} className="flex gap-3 rounded-tile bg-success/10 p-4 text-[14px]">
            <Lock className="mt-0.5 size-5 shrink-0 text-success-on-dark" aria-hidden />
            <span><strong className="font-semibold text-success-on-dark">Consented information.</strong> {name.split(" ")[0]} shared this by applying. Only your team sees it.</span>
          </m.p>
          {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
          <m.div variants={rise} custom={2} className="max-w-[480px]"><Pills label="Candidate sections" options={TABS} value={tab} onChange={setTab} segmented /></m.div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
              {tab === "overview" && (
                <div className="space-y-5">
                  <Panel title="Key information">
                    <ul className="space-y-2.5">{info.map(([I, t]) => <li key={t} className="flex items-start gap-3 text-[15px]"><I className="mt-0.5 size-4.5 shrink-0 text-faint" aria-hidden /> {t}</li>)}</ul>
                    {c.bio && <p className="mt-4 border-t border-line pt-4 text-[15px] leading-relaxed text-foreground/85">{c.bio}</p>}
                    {(c.skills?.length ?? 0) > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">{c.skills!.map((s) => <span key={s.name} className="rounded-full bg-foreground/8 px-3 py-1 text-[13px]">{s.name}</span>)}</div>
                    )}
                  </Panel>
                  <Panel title="Must-have evidence" action={must.length ? <span className="text-[15px] font-semibold">{shown}/{must.length}</span> : undefined}>
                    <EvidenceList items={evidence} />
                  </Panel>
                </div>
              )}
              {tab === "resume" && (
                <Panel title="Resume">
                  {c.cvUrl ? (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-[15px]"><FileText className="size-5 text-faint" aria-hidden /> {c.resumeFileName ?? "Resume"}{c.resumeUploadedAt && <span className="text-faint"> · updated {timeAgo(c.resumeUploadedAt)}</span>}</p>
                      <iframe title={`${name}'s resume`} src={c.cvUrl} className="h-[70svh] w-full rounded-xl border border-line bg-white" />
                      <a href={c.cvUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4 hover:underline">Open in a new tab</a>
                    </div>
                  ) : (
                    <p className="text-[15px] text-faint">{c.resumeFileName ? `${name.split(" ")[0]} has a resume (${c.resumeFileName}), but it isn't viewable here yet.` : `${name.split(" ")[0]} hasn't shared a resume. Their profile and evidence are above.`}</p>
                  )}
                </Panel>
              )}
              {tab === "evidence" && (
                <Panel title="Must-have evidence" action={must.length ? <span className="text-[15px] font-semibold">{shown}/{must.length}</span> : undefined}>
                  <EvidenceList items={evidence} />
                  <p className="mt-4 text-[13px] text-faint">Evidence comes only from what {name.split(" ")[0]} shared: skills, title and about. &ldquo;Not shown&rdquo; means not on their profile — not that they can&apos;t do it. Ask in the interview.</p>
                </Panel>
              )}
              {tab === "notes" && (
                <Panel title="Recruiter notes (private)">
                  <label htmlFor="note" className="sr-only">Add a note</label>
                  <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={600} placeholder="What stood out? Keep it about the work." className="w-full rounded-xl border border-field-line bg-transparent p-3 text-[15px] outline-none focus-visible:border-primary" />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-faint">Saved on this device only, for now.</p>
                    <DashButton onClick={saveNote} disabled={!note.trim()}>Add note</DashButton>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    <AnimatePresence initial={false}>
                      {notes.map((n) => (
                        <m.li key={n.at} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-foreground/6 p-3 text-[15px]">
                          {n.text}
                          <span className="mt-1 block text-[12px] text-faint">{timeAgo(n.at)}</span>
                        </m.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </Panel>
              )}
            </m.div>
          </AnimatePresence>
          <div className="lg:hidden">{actions}</div>
        </div>

        <m.aside variants={rise} custom={3} className="hidden space-y-5 lg:block">
          <Panel title="Next step">
            <p className="mb-3 text-[14px] text-faint">Currently <strong className="font-semibold text-foreground">{STAGE_LABEL[app.stage]}</strong>.</p>
            {actions}
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-3 text-[14px]">
              {app.updatedAt && app.updatedAt !== app.appliedAt && <li className="flex gap-2"><Check className="mt-0.5 size-4 text-success-on-dark" aria-hidden /> Moved to {STAGE_LABEL[app.stage]} · {timeAgo(app.updatedAt)}</li>}
              <li className="flex gap-2"><Check className="mt-0.5 size-4 text-faint" aria-hidden /> Applied · {shortDate(app.appliedAt, true)}</li>
            </ol>
            <p className="mt-3 text-[12px] text-faint">Candidate data is kept for 12 months after the role closes, then deleted.</p>
          </Panel>
          <Panel title="Stages">
            <ol className="flex flex-wrap gap-1.5">{STAGES.map((s) => <li key={s.id} className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", s.id === app.stage ? STAGE_TONE[s.id] : "text-faint")}>{s.label}</li>)}</ol>
          </Panel>
        </m.aside>
      </m.div>

      <NotSelectedSheet
        people={rejecting ? [app] : []}
        company={profile?.companyName ?? "our team"}
        onClose={() => setRejecting(false)}
        onConfirm={async () => {
          await move("rejected");
          setRejecting(false);
        }}
      />
    </>,
  );
}
