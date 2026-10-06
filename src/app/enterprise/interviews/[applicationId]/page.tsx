"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { m } from "motion/react";
import { ArrowLeft, Check, ChevronRight, Info, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton, Panel } from "@/components/dash/Parts";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { NotSelectedSheet } from "@/components/business/NotSelectedSheet";
import { getApplicant, getCandidateDetail, getMyEnterpriseProfile, getPosting, moveApplicantStage } from "@/lib/api/enterprise";
import { assignHiringManager, getInterviewForApplication, proposeInterview } from "@/lib/api/interviews";
import { getHiringManagersForTeam, type TeamMember } from "@/lib/api/companyAdmin";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { ALLOWED_COMPANY_MOVES, STAGE_LABEL, STAGE_TONE, jobParts, type Applicant } from "@/lib/data/business";
import { shortDate, timeAgo } from "@/lib/data/time";
import type { Application, ApplicationStage, CandidateProfile, EnterpriseProfile, Interview, JobPosting } from "@/lib/types";

/** Recruiter board 7 — Interview & outcome. Same calls as before: getApplicant →
 *  getInterviewForApplication ?? proposeInterview, assignHiringManager, InterviewRoom feedback;
 *  plus moveApplicantStage for Update status / Send offer / Not selected (kind sheet first). */
export default function EnterpriseInterviewPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [posting, setPosting] = useState<JobPosting | null>(null);
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [managers, setManagers] = useState<TeamMember[]>([]);
  const [assigned, setAssigned] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [target, setTarget] = useState<ApplicationStage | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getHiringManagersForTeam().then(setManagers).catch(() => {});
    getApplicant(applicationId).then(async (a) => {
      setApp(a ?? null);
      if (!a) return setInterview(null);
      getCandidateDetail(a.candidateId).then(setCandidate).catch(() => {});
      if (a.postingId) getPosting(a.postingId).then((p) => setPosting(p ?? null)).catch(() => {});
      try {
        // The recruiter side can start scheduling from here (unchanged behaviour).
        const existing = await getInterviewForApplication(applicationId);
        setInterview(existing ?? (await proposeInterview(applicationId)));
      } catch {
        setInterview(null);
      }
    });
  }, [applicationId, router]);

  const shell = (children: React.ReactNode) => <EnterpriseAppShell profile={profile}>{children}</EnterpriseAppShell>;
  if (app === undefined || interview === undefined) return shell(<div className="space-y-4"><Skeleton className="h-20" /><Skeleton className="h-48" /></div>);
  if (app === null || interview === null) return shell(<StateCard kind="empty" title="This interview isn't available" detail="The application may have been withdrawn." action={<DashButton href="/enterprise/interviews">All interviews</DashButton>} />);

  const name = candidate?.name ?? "Candidate";
  const must = posting ? jobParts(posting.description).must : [];
  const profileHref = app.postingId ? `/enterprise/postings/${app.postingId}/candidates/${app.id}` : `/enterprise/talent/${app.candidateId}`;

  const move = async (stage: ApplicationStage) => {
    setBusy(true);
    setError("");
    try {
      await moveApplicantStage(app.id, stage);
      setApp({ ...app, stage, updatedAt: new Date().toISOString() });
      setTarget("");
    } catch {
      setError("That didn't save. Try again.");
      throw new Error("move failed");
    } finally {
      setBusy(false);
    }
  };
  const update = () => {
    if (!target || target === app.stage) return;
    if (target === "rejected") setRejecting(true);
    else void move(target).catch(() => {});
  };
  const assign = async (m: TeamMember) => {
    setAssigning(true);
    try {
      await assignHiringManager(interview.id, m.userId);
      setAssigned(m.name);
    } catch {
      setError("The hiring manager wasn't assigned. Try again.");
    } finally {
      setAssigning(false);
    }
  };

  const trail = [
    ...(interview.status === "completed" && interview.feedback ? [{ at: interview.feedback.submittedAt, text: "Feedback sent" }] : []),
    ...(interview.status === "confirmed" || interview.status === "completed" ? [{ at: app.updatedAt, text: "Interview time confirmed" }] : []),
    ...(app.updatedAt !== app.appliedAt ? [{ at: app.updatedAt, text: `Moved to ${STAGE_LABEL[app.stage]}` }] : []),
    { at: app.appliedAt, text: "Applied" },
  ];

  const applicant = { ...app, candidate: candidate ?? undefined, posting: posting ?? ({ title: "this role" } as JobPosting) } as Applicant;

  return shell(
    <>
      <button type="button" onClick={() => (app.postingId ? router.push(`/enterprise/postings/${app.postingId}?tab=candidates`) : router.back())} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> {posting?.title ?? "Back"}
      </button>
      <m.div initial="hidden" animate="shown">
        <m.h1 variants={rise} className="font-display-serif text-[30px] font-medium leading-tight lg:text-[36px]">Interview &amp; outcome</m.h1>
        <m.p variants={rise} custom={1} className="text-[15px] text-faint">Move candidates forward with clarity.</m.p>
        <m.div variants={rise} custom={2}>
          <Link href={profileHref} data-surface="paper" className="mt-5 flex items-center gap-3 rounded-tile bg-paper p-4 text-paper-ink hover:bg-paper-muted">
            <Avatar name={name} className="size-12 text-[15px]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">{name}</span>
              <span className="block text-[14px] text-faint">{candidate?.title ? `${candidate.title} · ` : ""}{posting?.title}</span>
            </span>
            <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-bold", STAGE_TONE[app.stage])}>{STAGE_LABEL[app.stage]}</span>
            <ChevronRight className="size-5 text-faint" aria-hidden />
          </Link>
        </m.div>
      </m.div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <InterviewRoom
            interview={interview}
            me={{ name: profile?.companyName ?? "Your team", avatarEmoji: profile?.logoEmoji ?? "" }}
            counterpart={{ name, avatarEmoji: candidate?.avatarEmoji ?? "" }}
            canGiveFeedback
            stage={app.stage}
            mustHaves={must}
            place={posting ? `${posting.location}${posting.remote ? " (remote)" : ""}` : undefined}
            onInterviewUpdate={(iv) => {
              setInterview(iv);
              // Feedback moves the stage server-side; re-read it so the page matches.
              getApplicant(app.id).then((a) => a && setApp(a)).catch(() => {});
            }}
          />
        </div>
        <aside className="space-y-5">
          <Panel tone="paper" title="Update status">
            <label htmlFor="stage" className="sr-only">New status</label>
            {/* MARATHON-FE area 7: only the current stage plus the moves the backend actually
             *  allows from here (ALLOWED_COMPANY_MOVES) - picking anything else always failed. */}
            <select id="stage" value={target || app.stage} onChange={(e) => setTarget(e.target.value as ApplicationStage)} className="min-h-12 w-full rounded-xl border border-field-line bg-transparent px-3 text-[15px] [&>option]:text-paper-ink">
              <option value={app.stage}>{STAGE_LABEL[app.stage]}</option>
              {(ALLOWED_COMPANY_MOVES[app.stage] ?? []).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            <div className="mt-3"><DashButton onClick={update} disabled={busy || !target || target === app.stage}>Update</DashButton></div>
          </Panel>
          {app.stage !== "rejected" && app.stage !== "hired" && (
            <Panel tone="paper" title="Offer & close">
              <div className="flex flex-wrap gap-2">
                {app.stage !== "offer" && <DashButton onClick={() => move("offer").catch(() => {})} disabled={busy}>Send offer</DashButton>}
                <DashButton variant="outline" onClick={() => setRejecting(true)} disabled={busy}>Not selected</DashButton>
              </div>
              {/* "Mark as hired" removed (MARATHON-FE area 7): only the candidate's own offer
               *  accept sets Hired - a company move straight to "hired" always failed
               *  ("Only the candidate can accept an offer"). */}
              <p className="mt-3 text-[13px] text-faint">&ldquo;Send offer&rdquo; moves them to Offer and Arena tells them; they accept or decline it themselves. Offer letters aren&apos;t in Arena yet.</p>
            </Panel>
          )}
          {managers.length > 0 && (
            <Panel tone="paper" title="Hiring manager">
              {assigned ? (
                <p className="flex items-center gap-2 text-[15px]"><Check className="size-4 text-success-on-dark" aria-hidden /> Assigned to {assigned}</p>
              ) : (
                <label className="flex items-center gap-2 text-[15px]">
                  <UserPlus className="size-4 text-faint" aria-hidden />
                  <span className="sr-only">Assign a hiring manager</span>
                  <select defaultValue="" disabled={assigning} onChange={(e) => { const hm = managers.find((x) => x.userId === e.target.value); if (hm) void assign(hm); }} className="min-h-11 flex-1 rounded-xl border border-field-line bg-transparent px-3 [&>option]:text-paper-ink">
                    <option value="" disabled>Assign a hiring manager…</option>
                    {managers.map((x) => <option key={x.userId} value={x.userId}>{x.name}</option>)}
                  </select>
                </label>
              )}
            </Panel>
          )}
          <Panel tone="paper" title="Activity">
            <ol className="relative space-y-3 border-l border-line pl-5">
              {trail.map((t, i) => (
                <li key={`${t.text}-${i}`} className="relative text-[14px]">
                  <span className={cn("absolute -left-[26.5px] top-1 size-3 rounded-full border-2 border-surface", i === 0 ? "bg-success" : "bg-foreground/30")} aria-hidden />
                  <span className="block font-medium">{t.text}</span>
                  <span className="block text-[13px] text-faint">{i === trail.length - 1 ? shortDate(t.at, true) : timeAgo(t.at)}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <p className="flex gap-2 px-1 text-[13px] text-faint"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> Candidate data is kept for 12 months after the role closes, then deleted.</p>
        </aside>
      </div>

      <NotSelectedSheet
        people={rejecting ? [applicant] : []}
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
