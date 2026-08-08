"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, Users, Bookmark, Search, ArrowRight, Sparkles } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyEnterpriseProfile, getMyPostings, getAllApplicantCounts } from "@/lib/api/enterprise";
import { getShortlistIds } from "@/lib/api/shortlist";
import { getCandidateById } from "@/lib/mock/candidates";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { EmptyState } from "@/components/ui/empty-state";
import type { EnterpriseProfile, JobPosting } from "@/lib/types";

function StatCard({ icon: Icon, value, label }: { icon: typeof Briefcase; value: string | number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/[0.03] p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary-soft"><Icon className="size-[18px]" /></div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function EnterpriseDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [postings, setPostings] = useState<JobPosting[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then((p) => {
      setProfile(p);
    });
    getShortlistIds().then(setShortlistIds);
    Promise.all([getMyPostings(), getAllApplicantCounts()]).then(([p, count]) => {
      setPostings(p);
      setApplicantCount(count);
    });
  }, [router]);

  if (!profile) {
    return (
      <EnterpriseAppShell title="Dashboard">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }

  const activePostings = postings.filter((p) => p.status === "open");

  return (
    <EnterpriseAppShell title={`Welcome, ${profile.companyName} ${profile.logoEmoji}`} profile={profile}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Briefcase} value={activePostings.length} label="Active postings" />
        <StatCard icon={Users} value={applicantCount} label="Total applicants" />
        <StatCard icon={Bookmark} value={shortlistIds.length} label="Saved shortlist" />
        <StatCard icon={Sparkles} value={`${profile.unlockCreditsTotal - profile.unlockCreditsUsed}`} label="Unlock credits left" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-bold">Your postings</p>
            <Link href="/enterprise/postings" className="text-xs font-medium text-primary-soft hover:underline">Manage all</Link>
          </div>
          <div className="space-y-2.5">
            {postings.slice(0, 4).map((p) => (
              <Link key={p.id} href={`/enterprise/postings/${p.id}`} className="flex items-center justify-between rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <span className="truncate">{p.title}</span>
                <Badge variant="secondary" className="shrink-0 bg-white/5 capitalize">{p.status}</Badge>
              </Link>
            ))}
            {postings.length === 0 && (
              <EmptyState
                title={<>No postings yet — <Link href="/enterprise/postings" className="text-primary-soft hover:underline">create one</Link>.</>}
                className="rounded-xl px-4 py-8 text-xs"
              />
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-bold">Recent Talent Universe activity</p>
            <Link href="/enterprise/talent" className="flex items-center gap-1 text-xs font-medium text-primary-soft hover:underline">
              <Search className="size-3" /> Search
            </Link>
          </div>
          <div className="space-y-2.5">
            {shortlistIds.slice(0, 4).map((id) => {
              const c = getCandidateById(id);
              if (!c) return null;
              return (
                <Link key={id} href={`/enterprise/talent/${id}`} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5">
                  <span className="text-lg">{c.avatarEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.title}</p>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
            {shortlistIds.length === 0 && (
              <EmptyState title="Save candidates from Talent Universe to see them here." className="rounded-xl px-4 py-8 text-xs" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-border bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold capitalize">{profile.plan} plan</p>
            <p className="text-xs text-muted-foreground">{profile.seatsUsed} of {profile.seatsTotal} seats used</p>
          </div>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(profile.seatsUsed / profile.seatsTotal) * 100}%` }} />
          </div>
          <Button variant="ghost-glass" size="sm" render={<Link href="/pricing" />} nativeButton={false}>Upgrade plan</Button>
        </div>
      </div>
    </EnterpriseAppShell>
  );
}
