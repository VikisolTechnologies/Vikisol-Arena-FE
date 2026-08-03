"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ClipboardCheck, Award, ArrowRight, type LucideIcon } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { SkillRadar } from "@/components/dashboard/SkillRadar";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CareerHealthGauge } from "@/components/dashboard/CareerHealthGauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMyProfile } from "@/lib/api/profile";
import { getActivityFeed } from "@/lib/api/activity";
import { getJobs } from "@/lib/api/jobs";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile, AgentActivityEvent, Job } from "@/lib/types";

function StatCard({ icon: Icon, value, label }: { icon: LucideIcon; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary-soft">
        <Icon className="size-[18px]" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [activity, setActivity] = useState<AgentActivityEvent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/auth");
      return;
    }
    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }
    getMyProfile().then(setProfile);
    getActivityFeed().then(setActivity);
    getJobs().then(setJobs);
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Dashboard">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </CandidateAppShell>
    );
  }

  const verifiedCount = profile.skills.filter((s) => s.verified).length;
  const topMatches = [...jobs].sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 4);
  const avgMatch = topMatches.length ? Math.round(topMatches.reduce((sum, j) => sum + j.matchPercentage, 0) / topMatches.length) : 0;
  const highMatchCount = jobs.filter((j) => j.matchPercentage >= 85).length;
  const appliedCount = activity.filter((e) => e.type === "applied").length;

  const radarAxes = [
    { label: "Experience", value: Math.min(profile.experienceYears / 15, 1) },
    { label: "Skills", value: Math.min(profile.skills.length / 8, 1) },
    { label: "Verified", value: verifiedCount / Math.max(profile.skills.length, 1) },
    { label: "Health", value: profile.careerHealth / 100 },
    { label: "Availability", value: profile.openTo.length / 3 },
    { label: "Market Fit", value: avgMatch / 100 },
  ];

  return (
    <CandidateAppShell title={`Welcome back, ${profile.name.split(" ")[0]} 👋`} profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CareerHealthGauge value={profile.careerHealth} />
        <StatCard icon={Zap} value={highMatchCount} label="Strong matches" />
        <StatCard icon={ClipboardCheck} value={appliedCount} label="Applications sent" />
        <StatCard icon={Award} value={verifiedCount} label="Verified skills" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-white/[0.03] p-6">
          <p className="mb-2 self-start font-display text-base font-bold">Identity graph</p>
          <SkillRadar axes={radarAxes} />
          <Button variant="ghost-glass" size="sm" className="mt-2 gap-1.5" render={<Link href="/identity" />} nativeButton={false}>
            View full identity <ArrowRight className="size-3.5" />
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-base font-bold">Top matches for you</p>
            <Link href="/discover" className="text-xs font-medium text-primary-soft hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {topMatches.map((job) => (
              <div key={job.id} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-3.5 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-lg">
                  {job.companyEmoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job.company} · {job.location}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary-soft">
                  {job.matchPercentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white/[0.03] p-6">
        <p className="mb-4 font-display text-base font-bold">While you slept</p>
        <ActivityFeed initial={activity} />
      </div>
    </CandidateAppShell>
  );
}
