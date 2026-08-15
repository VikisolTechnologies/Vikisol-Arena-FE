"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Building2 } from "lucide-react";
import { HiringManagerShell } from "@/components/app/HiringManagerShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { getMyAssignedInterviews, type HiringManagerInterview } from "@/lib/api/interviews";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TONE: Record<string, string> = {
  proposed: "bg-amber-500/15 text-amber-400",
  confirmed: "bg-primary/15 text-primary-soft",
  completed: "bg-emerald-500/15 text-emerald-400",
};

export default function MyInterviewsPage() {
  const router = useRouter();
  const [interviews, setInterviews] = useState<HiringManagerInterview[] | null>(null);

  useEffect(() => {
    getMyAssignedInterviews().then(setInterviews);
  }, []);

  return (
    <HiringManagerShell title="My interviews">
      {!interviews ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-2.5">
          {interviews.map((iv) => {
            const confirmedSlot = iv.proposedSlots.find((s) => s.id === iv.confirmedSlotId);
            return (
              <button
                key={iv.id}
                type="button"
                onClick={() => router.push(`/enterprise/interviews/mine/${iv.id}`)}
                className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
              >
                <span className="text-xl">{iv.candidateEmoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{iv.candidateName}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Building2 className="size-3" /> {iv.jobTitle} at {iv.companyName}
                  </p>
                </div>
                {confirmedSlot && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="size-3" /> {new Date(confirmedSlot.start).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                )}
                <Badge variant="secondary" className={`capitalize ${STATUS_TONE[iv.status] ?? "bg-secondary text-muted-foreground"}`}>
                  {iv.status}
                </Badge>
              </button>
            );
          })}
          {interviews.length === 0 && (
            <EmptyState title="No interviews assigned yet" description="A recruiter or admin will assign you one when scheduling." className="py-16" />
          )}
        </div>
      )}
    </HiringManagerShell>
  );
}
