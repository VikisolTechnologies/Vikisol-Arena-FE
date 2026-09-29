"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Bookmark, Briefcase, CalendarClock, Info, Plus, Sparkles, Users } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Skeleton } from "@/components/bplus/Primitives";
import { DashButton, Panel, Row, Stat, StatusPill } from "@/components/dash/Parts";
import { getMyEnterpriseProfile, getMyPostings, getCandidateDetail } from "@/lib/api/enterprise";
import { getShortlistIds } from "@/lib/api/shortlist";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { STAGE_LABEL, loadApplicants, waitingTooLong, type Applicant } from "@/lib/data/business";
import { timeAgo } from "@/lib/data/time";
import type { CandidateProfile, EnterpriseProfile, JobPosting } from "@/lib/types";

/** Arena for Business — Home (flow §8): what needs you today, then your roles and shortlist. */
export default function EnterpriseDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [postings, setPostings] = useState<JobPosting[] | null>(null);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<(CandidateProfile & { fullAccess: boolean })[]>([]);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getShortlistIds()
      .then((ids) => {
        setShortlistIds(ids);
        return Promise.all(ids.slice(0, 4).map((id) => getCandidateDetail(id)));
      })
      .then((cs) => setShortlist(cs.filter((c): c is CandidateProfile & { fullAccess: boolean } => c !== null)))
      .catch(() => {});
    getMyPostings()
      .then((p) => {
        setPostings(p);
        return loadApplicants(p);
      })
      .then(setApplicants)
      .catch(() => {
        setPostings((cur) => cur ?? []);
        setApplicants([]);
      });
  }, [router]);

  const open = (postings ?? []).filter((p) => p.status === "open");
  const inInterview = (applicants ?? []).filter((a) => a.stage === "interview");
  const fresh = (applicants ?? []).filter((a) => a.stage === "applied");
  const waiting = waitingTooLong(applicants ?? []);
  const credits = profile ? profile.unlockCreditsTotal - profile.unlockCreditsUsed : 0;

  return (
    <EnterpriseAppShell title={profile ? `Good to see you, ${profile.companyName}` : "Home"} profile={profile} actions={<DashButton href="/enterprise/postings?new=1"><Plus className="size-4" aria-hidden /> Post a job</DashButton>}>
      <p className="mb-5 flex items-start gap-2.5 rounded-tile border border-line bg-surface p-4 text-[14px] text-foreground/85">
        <Info className="mt-0.5 size-4 shrink-0 text-info-on-dark" aria-hidden />
        Company verification isn&apos;t open yet. Your jobs publish as usual; the &ldquo;Verified company&rdquo; badge appears once Arena can check your domain.
      </p>
      {!postings ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={Briefcase} value={open.length} label="Open roles" href="/enterprise/postings" />
          <Stat icon={Users} value={fresh.length} label="New applicants" tone="info" />
          <Stat icon={CalendarClock} value={inInterview.length} label="In interview" tone="success" href="/enterprise/interviews" />
          <Stat icon={Sparkles} value={credits} label="Unlock credits left" tone="warning" />
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel title="Needs you">
            {!applicants ? (
              <Skeleton className="h-20" />
            ) : waiting.length === 0 && fresh.length === 0 ? (
              <p className="text-[14px] text-faint">You&apos;re all caught up.</p>
            ) : (
              <ul className="space-y-2">
                {waiting.length > 0 && (
                  <li className="flex items-center gap-3 rounded-xl bg-warning/10 p-3 text-[15px]">
                    <AlertCircle className="size-5 shrink-0 text-warning" aria-hidden />
                    <span className="flex-1"><strong className="font-semibold">{waiting.length} candidate{waiting.length === 1 ? "" : "s"}</strong> waiting more than 3 days</span>
                  </li>
                )}
                {fresh.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <Row href={`/enterprise/postings/${a.posting.id}/candidates/${a.id}`} lead={<Avatar name={a.candidate?.name ?? "Candidate"} className="size-10 text-[14px]" />} title={a.candidate?.name ?? "New applicant"} meta={`${a.posting.title} · applied ${timeAgo(a.appliedAt)}`} trail={<span className="text-[12px] text-faint">{STAGE_LABEL[a.stage]}</span>} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Your jobs" action={<DashButton href="/enterprise/postings" variant="outline">All jobs</DashButton>}>
            {!postings ? (
              <Skeleton className="h-24" />
            ) : postings.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[15px] text-faint">No jobs yet.</p>
                <div className="mt-3"><DashButton href="/enterprise/postings?new=1">Post your first job</DashButton></div>
              </div>
            ) : (
              <ul>
                {postings.slice(0, 5).map((p) => {
                  const n = (applicants ?? []).filter((a) => a.posting.id === p.id).length;
                  return (
                    <li key={p.id}>
                      <Row href={`/enterprise/postings/${p.id}`} title={p.title} meta={`${p.remote ? "Remote" : p.location} · ${n} applicant${n === 1 ? "" : "s"}`} trail={<StatusPill status={p.status} />} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
        <div className="min-w-0 space-y-5">
          <Panel title="In interview">
            {inInterview.length === 0 ? (
              <p className="text-[14px] text-faint">No one is at the interview stage right now.</p>
            ) : (
              <ul>
                {inInterview.slice(0, 5).map((a) => (
                  <li key={a.id}><Row href={`/enterprise/interviews/${a.id}`} lead={<Avatar name={a.candidate?.name ?? "Candidate"} className="size-10 text-[14px]" />} title={a.candidate?.name ?? "Candidate"} meta={a.posting.title} /></li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Shortlist" action={<span className="inline-flex items-center gap-1 text-[13px] text-faint"><Bookmark className="size-3.5" aria-hidden /> {shortlistIds.length}</span>}>
            {shortlist.length === 0 ? (
              <p className="text-[14px] text-faint">Save people from Talent to see them here.</p>
            ) : (
              <ul>
                {shortlist.map((c) => (
                  <li key={c.id}><Row href={`/enterprise/talent/${c.id}`} lead={<Avatar name={c.name} className="size-10 text-[14px]" />} title={c.name} meta={c.title} /></li>
                ))}
              </ul>
            )}
          </Panel>
          {profile && (
            <Panel title={`${profile.plan[0].toUpperCase()}${profile.plan.slice(1)} plan`}>
              <p className="text-[14px] text-faint">{profile.seatsUsed} of {profile.seatsTotal} seats used</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuenow={profile.seatsUsed} aria-valuemin={0} aria-valuemax={profile.seatsTotal} aria-label="Seats used">
                <div className="h-full origin-left rounded-full bg-primary" style={{ transform: `scaleX(${Math.min(1, profile.seatsUsed / Math.max(1, profile.seatsTotal))})` }} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </EnterpriseAppShell>
  );
}
