"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Lock } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyProfile } from "@/lib/api/profile";
import { getMyApplications } from "@/lib/api/applications";
import { getJob } from "@/lib/api/jobs";
import { proposeInterview, confirmInterviewSlot, getInterviewForApplication } from "@/lib/api/interviews";
import { useGsap } from "@/lib/gsap";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatFriendlyDateTime } from "@/lib/format";
import type { CandidateProfile, Application, ApplicationStage, Interview, Job } from "@/lib/types";

const COLUMNS: { stage: ApplicationStage; label: string }[] = [
  { stage: "applied", label: "Applied" },
  { stage: "screening", label: "Screening" },
  { stage: "interview", label: "Interview" },
  { stage: "offer", label: "Offer" },
  { stage: "rejected", label: "Rejected" },
];

function daysAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000)));
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [jobsById, setJobsById] = useState<Record<string, Job>>({});
  const [schedulingApp, setSchedulingApp] = useState<Application | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const lockRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getMyApplications().then(async (myApps) => {
      setApps(myApps);
      const jobIds = [...new Set(myApps.map((a) => a.jobId).filter((id): id is string => !!id))];
      const jobs = await Promise.all(jobIds.map((id) => getJob(id)));
      const map: Record<string, Job> = {};
      jobs.forEach((j, i) => { if (j) map[jobIds[i]] = j; });
      setJobsById(map);
    });
  }, [router]);

  useGSAP(() => {
    if (!confirmed || !lockRef.current) return;
    gsap.fromTo(lockRef.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" });
  }, [confirmed]);

  const openScheduler = async (app: Application) => {
    setSchedulingApp(app);
    setConfirmed(false);
    const existing = await getInterviewForApplication(app.id);
    setInterview(existing ?? (await proposeInterview(app.id)));
  };

  const confirmSlot = async (slotId: string) => {
    if (!interview) return;
    setConfirming(true);
    const updated = await confirmInterviewSlot(interview.id, slotId);
    setInterview(updated);
    setConfirming(false);
    setConfirmed(true);
  };

  if (!profile) {
    return (
      <CandidateAppShell title="Applications">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Applications" profile={profile}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ stage, label }) => {
          const items = apps.filter((a) => a.stage === stage);
          return (
            <div key={stage} className="w-[260px] shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <Badge variant="secondary" className="bg-white/5">{items.length}</Badge>
              </div>
              <div className="space-y-2.5">
                {items.map((app) => {
                  if (!app.jobId) return null;
                  const job = jobsById[app.jobId];
                  if (!job) return null;
                  return (
                    <div
                      key={app.id}
                      className="cursor-pointer rounded-2xl border border-border bg-white/[0.03] p-3.5 transition-colors hover:border-primary/40"
                      onClick={() => router.push(`/applications/${app.id}`)}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">{job.companyEmoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{job.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground">Applied {daysAgo(app.appliedAt)}d ago</p>
                      {stage === "interview" && (
                        <Button
                          variant="ghost-glass"
                          size="sm"
                          className="mt-2.5 w-full gap-1.5"
                          onClick={(e) => { e.stopPropagation(); openScheduler(app); }}
                        >
                          <CalendarClock className="size-3.5" /> Schedule
                        </Button>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border-strong px-3 py-6 text-center text-xs text-muted-foreground">
                    Nothing here yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!schedulingApp} onOpenChange={(open) => !open && setSchedulingApp(null)}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>{confirmed ? "Interview locked in" : "Proposed interview slots"}</DialogTitle>
            <DialogDescription>
              {confirmed ? "You just have to show up." : "Your agent read both calendars and proposed these times."}
            </DialogDescription>
          </DialogHeader>

          {confirmed ? (
            <div ref={lockRef} className="flex flex-col items-center gap-3 py-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Lock className="size-7" />
              </span>
              <p className="text-sm text-muted-foreground">
                {interview?.confirmedSlotId &&
                  formatFriendlyDateTime(
                    interview.proposedSlots.find((s) => s.id === interview.confirmedSlotId)?.start ?? "",
                  )}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost-glass" size="sm" onClick={() => setSchedulingApp(null)}>
                  Done
                </Button>
                {schedulingApp && (
                  <Button variant="primary-gradient" size="sm" onClick={() => router.push(`/interviews/${schedulingApp.id}`)}>
                    Go to interview room
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {interview?.proposedSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={confirming}
                  onClick={() => confirmSlot(slot.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-left text-sm transition-colors hover:border-primary/50 disabled:opacity-50"
                >
                  {formatFriendlyDateTime(slot.start)}
                  <Check className="size-4 text-primary-soft opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CandidateAppShell>
  );
}
