"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, CheckCircle2, XCircle, MessageCircle, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyProfile } from "@/lib/api/profile";
import { getJob } from "@/lib/api/jobs";
import { applyToJob, hasAppliedTo } from "@/lib/api/applications";
import { agentRealtime } from "@/lib/realtime";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatINRRange } from "@/lib/format";
import type { CandidateProfile, Job } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getJob(params.id).then((j) => setJob(j ?? null));
    hasAppliedTo(params.id).then(setApplied);
  }, [params.id, router]);

  if (job === undefined || !profile) {
    return (
      <AppShell title="Opportunity">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (job === null) {
    return (
      <AppShell title="Opportunity">
        <p className="text-sm text-muted-foreground">This opportunity isn&apos;t available anymore.</p>
      </AppShell>
    );
  }

  const profileSkills = new Set(profile.skills.map((s) => s.name.toLowerCase()));
  const matchedSkills = job.skills.filter((s) => profileSkills.has(s.toLowerCase()));
  const missingSkills = job.skills.filter((s) => !profileSkills.has(s.toLowerCase()));
  const salaryFit = job.salaryMax >= profile.rateFloor;
  const locationFit = job.remote || job.location === profile.location;

  const handleApply = async () => {
    setApplying(true);
    await applyToJob(job.id);
    agentRealtime.emit({
      id: `evt-${Date.now()}`,
      type: "applied",
      title: `Applied to ${job.title} at ${job.company}`,
      description: `${job.matchPercentage}% match — resume tailored to this role.`,
      timestamp: new Date().toISOString(),
      relatedJobId: job.id,
      undoable: true,
    });
    setApplied(true);
    setApplying(false);
  };

  return (
    <AppShell profile={profile}>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder, see PersonAvatar */}
            <img
              src={`https://picsum.photos/seed/${encodeURIComponent(job.id)}/112/112`}
              alt=""
              className="size-14 shrink-0 rounded-2xl object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold tracking-tight">{job.title}</h1>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {job.location} {job.remote && "· Remote"}
                </span>
                <span>{formatINRRange(job.salaryMin, job.salaryMax, "LPA")}</span>
                <Badge variant="secondary" className="bg-secondary">{job.employmentType}</Badge>
                <span>Posted {job.postedDaysAgo === 0 ? "today" : `${job.postedDaysAgo}d ago`}</span>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 bg-primary/12 text-lg text-primary-soft">
              {job.matchPercentage}%
            </Badge>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{job.description}</p>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <Badge key={s} variant="secondary" className="bg-secondary text-muted-foreground">{s}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-card p-5">
            <p className="mb-3 champagne-hairline font-display text-sm font-bold">Why this match?</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                <span className="text-muted-foreground">Salary fit</span>
                {salaryFit ? <CheckCircle2 className="size-4 text-emerald-400" /> : <XCircle className="size-4 text-amber-400" />}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2">
                <span className="text-muted-foreground">Location fit</span>
                {locationFit ? <CheckCircle2 className="size-4 text-emerald-400" /> : <XCircle className="size-4 text-amber-400" />}
              </div>
            </div>
            {matchedSkills.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 text-xs text-muted-foreground">Skills you have</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-emerald-500/15 text-emerald-400">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {missingSkills.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs text-muted-foreground">Not on your profile yet</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-secondary text-muted-foreground">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <Button
              variant="default"
              size="cta"
              className="w-full"
              disabled={applied || applying}
              onClick={handleApply}
            >
              {applied ? "Applied ✓" : applying ? "Applying…" : "Apply with agent"}
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="w-full gap-1.5"
              onClick={() => router.push(`/agent?about=${job.id}`)}
            >
              <MessageCircle className="size-4" /> Ask agent about this role
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
