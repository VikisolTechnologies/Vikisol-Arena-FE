"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, Send, Eye, CalendarCheck2, Trash2 } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { TailoredResume } from "@/components/applications/TailoredResume";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/lib/api/profile";
import { getMyApplications, withdrawApplication } from "@/lib/api/applications";
import { getJob } from "@/lib/api/jobs";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { CandidateProfile, Application, Job } from "@/lib/types";

const TIMELINE = [
  { key: "found", label: "Found", icon: Search },
  { key: "applied", label: "Applied", icon: Send },
  { key: "viewed", label: "Viewed by recruiter", icon: Eye },
  { key: "interview", label: "Interview", icon: CalendarCheck2 },
];

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [app, setApp] = useState<Application | null | undefined>(undefined);
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getMyApplications().then(async (apps) => {
      const found = apps.find((a) => a.id === params.id) ?? null;
      setApp(found);
      if (found?.jobId) setJob((await getJob(found.jobId)) ?? null);
      else setJob(null);
    });
  }, [params.id, router]);

  if (app === undefined || !profile || (app && job === undefined)) {
    return (
      <CandidateAppShell title="Application">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }
  if (app === null) {
    return (
      <CandidateAppShell title="Application">
        <p className="text-sm text-muted-foreground">This application isn&apos;t here anymore.</p>
      </CandidateAppShell>
    );
  }
  if (!job) {
    return (
      <CandidateAppShell title="Application">
        <p className="text-sm text-muted-foreground">This opportunity is no longer available.</p>
      </CandidateAppShell>
    );
  }

  const reachedIndex =
    app.stage === "applied" ? 1 : app.stage === "screening" ? 2 : app.stage === "interview" || app.stage === "offer" ? 3 : 1;

  const handleWithdraw = async () => {
    setWithdrawing(true);
    await withdrawApplication(app.id);
    router.push("/applications");
  };

  return (
    <CandidateAppShell profile={profile}>
      <button
        type="button"
        onClick={() => router.push("/applications")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Applications
      </button>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border bg-white/[0.03] p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-xl">{job.companyEmoji}</span>
          <div>
            <p className="font-display text-lg font-bold">{job.title}</p>
            <p className="text-sm text-muted-foreground">{job.company} · {job.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/12 text-primary-soft capitalize">{app.stage}</Badge>
          {app.stage === "interview" && (
            <Button variant="primary-gradient" size="sm" onClick={() => router.push(`/interviews/${app.id}`)}>
              Interview room
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-[24px] border border-border bg-white/[0.03] p-5">
        <div className="flex flex-wrap gap-4 sm:gap-0">
          {TIMELINE.map((step, i) => (
            <div key={step.key} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    i <= reachedIndex ? "bg-primary/15 text-primary-soft" : "bg-white/5 text-muted-foreground",
                  )}
                >
                  <step.icon className="size-4" />
                </span>
                <span className={cn("text-xs font-medium", i <= reachedIndex ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
              {i < TIMELINE.length - 1 && (
                <div className={cn("mx-2 hidden h-px flex-1 sm:block", i < reachedIndex ? "bg-primary/40" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-[24px] border border-primary/25 bg-primary/[0.05] p-5">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary-soft">Agent&apos;s rationale</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Matched on {job.skills.slice(0, 2).join(" and ")}, within your {formatINR(profile.rateFloor)} LPA floor, and{" "}
          {job.remote ? "fully remote" : `based in ${job.location}`}. Scored {job.matchPercentage}% against your identity
          graph — above your 80% auto-apply threshold, so I submitted a tailored resume right away.
        </p>
      </div>

      <p className="mb-3 font-display text-sm font-bold">The resume your agent submitted</p>
      <TailoredResume profile={profile} job={job} />

      <Button
        variant="ghost-glass"
        size="sm"
        className="mt-5 gap-1.5 text-red-400 hover:text-red-300"
        disabled={withdrawing}
        onClick={handleWithdraw}
      >
        <Trash2 className="size-3.5" /> {withdrawing ? "Withdrawing…" : "Withdraw application"}
      </Button>
    </CandidateAppShell>
  );
}
