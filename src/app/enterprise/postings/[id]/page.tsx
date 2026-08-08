"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, User } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyEnterpriseProfile, getPosting, getApplicantsForPosting, moveApplicantStage } from "@/lib/api/enterprise";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import { EmptyState } from "@/components/ui/empty-state";
import type { EnterpriseProfile, JobPosting, Application, ApplicationStage, CandidateProfile } from "@/lib/types";

const STAGES: ApplicationStage[] = ["applied", "screening", "interview", "offer", "rejected"];

type ApplicantWithCandidate = Application & { candidate: CandidateProfile | undefined };

export default function ApplicantPipelinePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [posting, setPosting] = useState<JobPosting | null | undefined>(undefined);
  const [applicants, setApplicants] = useState<ApplicantWithCandidate[]>([]);

  const load = () => getApplicantsForPosting(params.id).then((a) => setApplicants(a as ApplicantWithCandidate[]));

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then(setProfile);
    getPosting(params.id).then((p) => setPosting(p ?? null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (posting === undefined || !profile) {
    return (
      <EnterpriseAppShell title="Applicants">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }
  if (posting === null) {
    return (
      <EnterpriseAppShell title="Applicants">
        <p className="text-sm text-muted-foreground">This posting isn&apos;t available anymore.</p>
      </EnterpriseAppShell>
    );
  }

  const advance = async (applicant: ApplicantWithCandidate) => {
    const idx = STAGES.indexOf(applicant.stage);
    const next = STAGES[Math.min(idx + 1, STAGES.length - 2)]; // never auto-advance into "rejected"
    await moveApplicantStage(applicant.id, next);
    load();
  };

  const reject = async (applicant: ApplicantWithCandidate) => {
    await moveApplicantStage(applicant.id, "rejected");
    load();
  };

  return (
    <EnterpriseAppShell profile={profile}>
      <button type="button" onClick={() => router.push("/enterprise/postings")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Postings
      </button>
      <h1 className="mb-5 font-display text-xl font-bold tracking-tight">{posting.title}</h1>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const items = applicants.filter((a) => a.stage === stage);
          return (
            <div key={stage} className="w-[260px] shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{stage}</p>
                <Badge variant="secondary" className="bg-white/5">{items.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {items.map((applicant) => (
                  <div key={applicant.id} className="rounded-2xl border border-border bg-white/[0.03] p-3.5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 text-left"
                      onClick={() => router.push(`/enterprise/talent/${applicant.candidateId}`)}
                    >
                      <span className="text-lg">{applicant.candidate?.avatarEmoji ?? <User className="size-4" />}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{applicant.candidate?.name ?? "Candidate"}</p>
                        <p className="truncate text-xs text-muted-foreground">{applicant.candidate?.title}</p>
                      </div>
                    </button>
                    {stage === "interview" && (
                      <Button
                        variant="primary-gradient"
                        size="sm"
                        className="mt-2.5 w-full"
                        onClick={() => router.push(`/enterprise/interviews/${applicant.id}`)}
                      >
                        Join interview
                      </Button>
                    )}
                    {stage !== "rejected" && stage !== "offer" && (
                      <div className="mt-2.5 flex gap-1.5">
                        <Button variant="ghost-glass" size="sm" className="flex-1 gap-1" onClick={() => advance(applicant)}>
                          Advance <ArrowRight className="size-3" />
                        </Button>
                        <Button variant="ghost-glass" size="sm" className="text-red-400" onClick={() => reject(applicant)}>
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && <EmptyState title="Nothing here" className="px-3 py-6 text-xs" />}
              </div>
            </div>
          );
        })}
      </div>
    </EnterpriseAppShell>
  );
}
