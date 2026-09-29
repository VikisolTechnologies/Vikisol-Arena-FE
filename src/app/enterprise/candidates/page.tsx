"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { CandidateList } from "@/components/business/CandidateList";
import { NotSelectedSheet } from "@/components/business/NotSelectedSheet";
import { getApplicantsForPosting, getMyEnterpriseProfile, getMyPostings, moveApplicantStage } from "@/lib/api/enterprise";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { jobParts, type Applicant } from "@/lib/data/business";
import type { ApplicationStage, EnterpriseProfile, JobPosting } from "@/lib/types";

/** Recruiter board 5 — Candidates, as its own screen (the bottom bar's Candidates tab). One job at a
 *  time, because evidence is checked against that job's must-haves. Same getMyPostings /
 *  getApplicantsForPosting / moveApplicantStage calls as the job page; Not selected always goes
 *  through the kind-message sheet. */
export default function CandidatesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [postings, setPostings] = useState<JobPosting[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [rejecting, setRejecting] = useState<Applicant[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
    getMyPostings()
      .then((ps) => {
        const open = ps.filter((p) => p.status !== "closed");
        const list = open.length ? open : ps;
        setPostings(list);
        setJobId((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch(() => setError("Your jobs didn't load. Refresh to try again."));
  }, [router]);

  const posting = postings?.find((p) => p.id === jobId) ?? null;

  useEffect(() => {
    if (!posting) return;
    let cancelled = false;
    getApplicantsForPosting(posting.id)
      .then((as) => !cancelled && setApplicants(as.map((a) => ({ ...a, posting }))))
      .catch(() => !cancelled && setError("Candidates didn't load. Refresh to try again."));
    return () => {
      cancelled = true;
    };
  }, [posting]);

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
      setError(`${failed.length === 1 ? "One move" : `${failed.length} moves`} didn't save.`);
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

  return (
    <EnterpriseAppShell profile={profile} title="Candidates">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {postings === null ? (
        <div className="space-y-3"><Skeleton className="h-12" /><Skeleton className="h-64" /></div>
      ) : postings.length === 0 ? (
        <StateCard kind="empty" title="No jobs yet" detail="Post a job and the people who apply show up here, checked against your must-haves." action={<DashButton href="/enterprise/postings/new">Post a job</DashButton>} />
      ) : (
        <>
          {postings.length > 1 && (
            <label className="mb-4 block max-w-[420px]">
              <span className="text-[13px] font-semibold text-faint">Job</span>
              <select
                value={jobId ?? ""}
                onChange={(e) => {
                  setApplicants(null);
                  setJobId(e.target.value);
                }}
                className="mt-1 h-12 w-full rounded-xl border border-field-line bg-surface px-3 text-[16px] outline-none focus:border-primary"
              >
                {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          )}
          {postings.length === 1 && posting && <p className="-mt-3 mb-4 text-[15px] text-faint">{posting.title}</p>}
          {!applicants || !posting ? (
            <Skeleton className="h-72" />
          ) : (
            <CandidateList applicants={applicants} must={jobParts(posting.description).must} hrefFor={(a) => `/enterprise/postings/${posting.id}/candidates/${a.id}`} onMove={move} onBulk={bulk} />
          )}
        </>
      )}
      <NotSelectedSheet
        people={rejecting}
        company={profile?.companyName ?? "our team"}
        onClose={() => setRejecting([])}
        onConfirm={async (people) => {
          await apply(people, "rejected");
          setRejecting([]);
        }}
      />
    </EnterpriseAppShell>
  );
}
