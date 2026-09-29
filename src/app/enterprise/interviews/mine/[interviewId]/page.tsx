"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HiringManagerShell } from "@/components/app/HiringManagerShell";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { InterviewRoom } from "@/components/interview/InterviewRoom";
import { getMyAssignedInterview, type HiringManagerInterview } from "@/lib/api/interviews";

/** Hiring manager — one assigned interview (HM2/HM3). Same `getMyAssignedInterview` call. */
export default function MyInterviewRoomPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const router = useRouter();
  const [interview, setInterview] = useState<HiringManagerInterview | null | undefined>(undefined);

  useEffect(() => {
    getMyAssignedInterview(interviewId).then(setInterview).catch(() => setInterview(null));
  }, [interviewId]);

  if (interview === undefined) return <HiringManagerShell title="Interview"><Skeleton className="h-64" /></HiringManagerShell>;
  if (interview === null) {
    return (
      <HiringManagerShell title="Interview">
        <StateCard kind="empty" title="This interview isn't available" detail="It isn't assigned to you, or it no longer exists." action={<DashButton href="/enterprise/interviews/mine">My interviews</DashButton>} />
      </HiringManagerShell>
    );
  }

  return (
    <HiringManagerShell>
      <button type="button" onClick={() => router.push("/enterprise/interviews/mine")} className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-faint hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> My interviews
      </button>
      <h1 className="font-display-serif text-[30px] font-medium leading-tight">Interview with {interview.candidateName}</h1>
      <p className="mb-5 text-[15px] text-faint">{interview.jobTitle} at {interview.companyName}</p>
      <InterviewRoom
        interview={interview}
        me={{ name: "You", avatarEmoji: "" }}
        counterpart={{ name: interview.candidateName, avatarEmoji: interview.candidateEmoji }}
        canGiveFeedback
        onInterviewUpdate={(updated) => setInterview({ ...interview, ...updated })}
      />
    </HiringManagerShell>
  );
}
