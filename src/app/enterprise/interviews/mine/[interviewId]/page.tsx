"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HiringManagerShell } from "@/components/app/HiringManagerShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { getMyAssignedInterview, type HiringManagerInterview } from "@/lib/api/interviews";

export default function MyInterviewRoomPage() {
  const params = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<HiringManagerInterview | null | undefined>(undefined);

  useEffect(() => {
    getMyAssignedInterview(params.interviewId).then(setInterview);
  }, [params.interviewId]);

  if (interview === undefined) {
    return (
      <HiringManagerShell title="Interview">
        <OrbLoader className="h-96" />
      </HiringManagerShell>
    );
  }
  if (interview === null) {
    return (
      <HiringManagerShell title="Interview">
        <p className="text-sm text-muted-foreground">This interview isn&apos;t assigned to you, or doesn&apos;t exist.</p>
      </HiringManagerShell>
    );
  }

  return (
    <HiringManagerShell>
      <button
        type="button"
        onClick={() => router.push("/enterprise/interviews/mine")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to my interviews
      </button>
      <h1 className="mb-5 font-display text-xl font-bold tracking-tight">
        Interview with {interview.candidateName} — {interview.jobTitle} at {interview.companyName}
      </h1>
      <InterviewRoom
        interview={interview}
        me={{ name: "You", avatarEmoji: "🧑🏽‍💼" }}
        counterpart={{ name: interview.candidateName, avatarEmoji: interview.candidateEmoji }}
        canGiveFeedback
        onInterviewUpdate={(updated) => setInterview({ ...interview, ...updated })}
      />
    </HiringManagerShell>
  );
}
