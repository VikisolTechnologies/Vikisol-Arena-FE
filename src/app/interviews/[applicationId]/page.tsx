"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { getMyProfile } from "@/lib/api/profile";
import { getApplicationById } from "@/lib/api/applications";
import { getInterviewForApplication } from "@/lib/api/interviews";
import { getJob } from "@/lib/api/jobs";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Application, Interview } from "@/lib/types";

export default function CandidateInterviewPage() {
  const params = useParams<{ applicationId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [application, setApplication] = useState<Application | null | undefined>(undefined);
  const [interview, setInterview] = useState<Interview | null | undefined>(undefined);
  const [companyName, setCompanyName] = useState("Interviewer");
  const [companyEmoji, setCompanyEmoji] = useState("🏢");

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getApplicationById(params.applicationId).then(async (app) => {
      setApplication(app ?? null);
      if (app?.jobId) {
        const job = await getJob(app.jobId);
        if (job) { setCompanyName(job.company); setCompanyEmoji(job.companyEmoji); }
      }
      getInterviewForApplication(params.applicationId).then((iv) => setInterview(iv ?? null));
    });
  }, [params.applicationId, router]);

  if (application === undefined || interview === undefined || !profile) {
    return (
      <CandidateAppShell title="Interview">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }
  if (application === null || interview === null) {
    return (
      <CandidateAppShell title="Interview">
        <p className="text-sm text-muted-foreground">No interview scheduled for this application yet.</p>
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell profile={profile}>
      <button
        type="button"
        onClick={() => router.push(`/applications/${application.id}`)}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to application
      </button>
      <h1 className="mb-5 font-display text-xl font-bold tracking-tight">Interview with {companyName}</h1>
      <InterviewRoom
        interview={interview}
        me={{ name: profile.name, avatarEmoji: profile.avatarEmoji }}
        counterpart={{ name: companyName, avatarEmoji: companyEmoji }}
        canGiveFeedback={false}
        onInterviewUpdate={setInterview}
      />
    </CandidateAppShell>
  );
}
