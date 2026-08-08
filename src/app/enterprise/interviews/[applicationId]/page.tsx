"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Check } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { getMyEnterpriseProfile, getCandidateDetail, getApplicant } from "@/lib/api/enterprise";
import { getInterviewForApplication, proposeInterview, assignHiringManager } from "@/lib/api/interviews";
import { getHiringManagersForTeam, type TeamMember } from "@/lib/api/companyAdmin";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import type { EnterpriseProfile, Application, Interview, CandidateProfile } from "@/lib/types";

export default function EnterpriseInterviewPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [hiringManagers, setHiringManagers] = useState<TeamMember[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignedName, setAssignedName] = useState<string | null>(null);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile);
    getHiringManagersForTeam().then(setHiringManagers);
    getApplicant(params.applicationId).then(async (app) => {
      setApplication(app ?? null);
      if (app) {
        getCandidateDetail(app.candidateId).then((c) => setCandidate(c));
        // The recruiter side can initiate scheduling directly from the pipeline, unlike the
        // candidate side which only ever confirms slots the agent already proposed.
        const existing = await getInterviewForApplication(params.applicationId);
        setInterview(existing ?? (await proposeInterview(params.applicationId)));
      } else {
        setInterview(null);
      }
    });
  }, [params.applicationId, router]);

  const doAssignHiringManager = async (userId: string, name: string) => {
    if (!interview) return;
    setAssigning(true);
    try {
      await assignHiringManager(interview.id, userId);
      setAssignedName(name);
    } finally {
      setAssigning(false);
    }
  };

  if (application === undefined || interview === undefined || !profile) {
    return (
      <EnterpriseAppShell title="Interview">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }
  if (application === null || interview === null) {
    return (
      <EnterpriseAppShell title="Interview">
        <p className="text-sm text-muted-foreground">This application isn&apos;t available anymore.</p>
      </EnterpriseAppShell>
    );
  }

  return (
    <EnterpriseAppShell profile={profile}>
      <button
        type="button"
        onClick={() => (application.postingId ? router.push(`/enterprise/postings/${application.postingId}`) : router.back())}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to pipeline
      </button>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight">Interview with {candidate?.name ?? "candidate"}</h1>
        {hiringManagers.length > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1.5">
            <UserPlus className="size-3.5 text-muted-foreground" />
            {assignedName ? (
              <span className="flex items-center gap-1 text-xs text-primary-soft"><Check className="size-3" /> Assigned to {assignedName}</span>
            ) : (
              <select
                defaultValue=""
                disabled={assigning}
                onChange={(e) => {
                  const hm = hiringManagers.find((m) => m.userId === e.target.value);
                  if (hm) doAssignHiringManager(hm.userId, hm.name);
                }}
                className="bg-transparent text-xs text-muted-foreground outline-none"
              >
                <option value="" disabled>Assign a hiring manager…</option>
                {hiringManagers.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
      <InterviewRoom
        interview={interview}
        me={{ name: profile.companyName, avatarEmoji: profile.logoEmoji }}
        counterpart={{ name: candidate?.name ?? "Candidate", avatarEmoji: candidate?.avatarEmoji ?? "🙂" }}
        canGiveFeedback
        onInterviewUpdate={setInterview}
      />
    </EnterpriseAppShell>
  );
}
