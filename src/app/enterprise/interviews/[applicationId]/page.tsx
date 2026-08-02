"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { getMyEnterpriseProfile, getCandidateDetail } from "@/lib/api/enterprise";
import { getApplicationById } from "@/lib/api/applications";
import { getInterviewForApplication, proposeInterview } from "@/lib/api/interviews";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import type { EnterpriseProfile, Application, Interview, CandidateProfile } from "@/lib/types";

export default function EnterpriseInterviewPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then(setProfile);
    getApplicationById(params.applicationId).then(async (app) => {
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
      <h1 className="mb-5 font-display text-xl font-bold tracking-tight">Interview with {candidate?.name ?? "candidate"}</h1>
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
