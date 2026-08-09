"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Users } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompanyFollowButton } from "@/components/companies/CompanyFollowButton";
import { getMyProfile } from "@/lib/api/profile";
import { getCompany, getCompanyJobs } from "@/lib/api/companies";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Company, Job } from "@/lib/types";

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [company, setCompany] = useState<Company | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[] | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getCompany(params.id).then((c) => setCompany(c ?? null));
    getCompanyJobs(params.id).then((p) => setJobs(p.content));
  }, [params.id, router]);

  if (company === undefined || !profile) {
    return (
      <CandidateAppShell title="Company">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }
  if (company === null) {
    return (
      <CandidateAppShell title="Company">
        <p className="text-sm text-muted-foreground">This company isn&apos;t available anymore.</p>
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell profile={profile}>
      <button
        type="button"
        onClick={() => router.push("/companies")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Companies
      </button>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{company.emoji}</span>
            <div>
              <p className="font-display text-lg font-bold">{company.name}</p>
              <p className="text-xs text-muted-foreground">{company.industry} · {company.size} employees</p>
            </div>
          </div>
          <CompanyFollowButton companyId={company.id} initialFollowing={!!company.viewerFollows} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Badge variant="secondary" className="gap-1 bg-white/5 text-[11px] text-muted-foreground">
            <Briefcase className="size-3" /> {company.openJobCount} open role{company.openJobCount === 1 ? "" : "s"}
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-white/5 text-[11px] text-muted-foreground">
            <Users className="size-3" /> {company.followerCount} follower{company.followerCount === 1 ? "" : "s"}
          </Badge>
        </div>
      </Card>

      <p className="mb-3 mt-6 font-display text-sm font-bold">Open roles</p>
      {!jobs ? (
        <OrbLoader className="h-48" />
      ) : jobs.length === 0 ? (
        <EmptyState title="No open roles right now" className="py-12" />
      ) : (
        <div className="space-y-2.5">
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => router.push(`/jobs/${j.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5 text-left transition-colors hover:border-white/20"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{j.title}</p>
                <p className="text-xs text-muted-foreground">{j.location}{j.remote ? " · Remote" : ""} · {j.employmentType}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 bg-white/5 text-[11px] text-muted-foreground">₹{j.salaryMin}-{j.salaryMax}L</Badge>
            </button>
          ))}
        </div>
      )}
    </CandidateAppShell>
  );
}
