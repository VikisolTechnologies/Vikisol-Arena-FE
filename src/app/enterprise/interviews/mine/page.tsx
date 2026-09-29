"use client";

import { useEffect, useState } from "react";
import { HiringManagerShell } from "@/components/app/HiringManagerShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Panel, Row } from "@/components/dash/Parts";
import { when } from "@/components/interview/InterviewRoom";
import { getMyAssignedInterviews, type HiringManagerInterview } from "@/lib/api/interviews";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  proposed: { label: "Time not picked", cls: "bg-warning/15 text-warning" },
  confirmed: { label: "Scheduled", cls: "bg-info/15 text-info-on-dark" },
  completed: { label: "Done", cls: "bg-success/15 text-success-on-dark" },
  cancelled: { label: "Cancelled", cls: "bg-foreground/10 text-faint" },
};

/** Hiring manager — My interviews (HM1). Same `getMyAssignedInterviews` call; B+ list. */
export default function MyInterviewsPage() {
  const [interviews, setInterviews] = useState<HiringManagerInterview[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMyAssignedInterviews().then(setInterviews).catch(() => {
      setError(true);
      setInterviews([]);
    });
  }, []);

  return (
    <HiringManagerShell title="My interviews">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">Interviews didn&apos;t load. Refresh to try again.</p>}
      {!interviews ? (
        <Skeleton className="h-64" />
      ) : interviews.length === 0 ? (
        !error && <StateCard kind="empty" title="No interviews assigned yet" detail="A recruiter or admin will assign you one when scheduling." />
      ) : (
        <Panel>
          <ul>
            {interviews.map((iv) => {
              const slot = iv.proposedSlots.find((s) => s.id === iv.confirmedSlotId);
              const st = STATUS[iv.status] ?? STATUS.proposed;
              return (
                <li key={iv.id}>
                  <Row
                    href={`/enterprise/interviews/mine/${iv.id}`}
                    lead={<Avatar name={iv.candidateName} className="size-10 text-[14px]" />}
                    title={iv.candidateName}
                    meta={`${iv.jobTitle} at ${iv.companyName}${slot ? ` · ${when(slot.start)}` : ""}`}
                    trail={<span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", st.cls)}>{st.label}</span>}
                  />
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </HiringManagerShell>
  );
}
