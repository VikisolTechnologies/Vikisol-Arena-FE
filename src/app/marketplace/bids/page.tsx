"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { Badge } from "@/components/ui/badge";
import { getMyProfile } from "@/lib/api/profile";
import { getMyBids, type MyBidRecord, type MyBidStatus } from "@/lib/api/myBids";
import { getProjectById } from "@/lib/mock/projects";
import { getMyProjects } from "@/lib/api/myProjects";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile, Project } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<MyBidStatus, string> = {
  pending: "bg-white/10 text-foreground",
  shortlisted: "bg-amber-500/15 text-amber-400",
  won: "bg-emerald-500/15 text-emerald-400",
  lost: "bg-red-500/15 text-red-400",
};

export default function MyBidsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [bids, setBids] = useState<MyBidRecord[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then(setProfile);
    Promise.all([getMyBids(), getMyProjects()]).then(([myBids, mine]) => {
      setBids(myBids);
      const map: Record<string, Project> = {};
      mine.forEach((p) => { map[p.id] = p; });
      setProjects(map);
    });
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="My Bids">
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="My Bids" profile={profile}>
      <button type="button" onClick={() => router.push("/marketplace")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Marketplace
      </button>

      <div className="space-y-2.5">
        {bids.map((bid) => {
          const project = projects[bid.projectId] ?? getProjectById(bid.projectId);
          return (
            <button
              key={bid.bidId}
              type="button"
              onClick={() => router.push(`/marketplace/${bid.projectId}`)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white/[0.03] p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{project?.title ?? "Project"}</p>
                <p className="text-xs text-muted-foreground">₹{bid.amount.toLocaleString("en-IN")} · {new Date(bid.submittedAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="secondary" className={cn("shrink-0 capitalize", STATUS_TONE[bid.status])}>{bid.status}</Badge>
            </button>
          );
        })}
        {bids.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center">
            <p className="text-sm font-medium">No bids yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Bids you place in the Marketplace will show up here.</p>
          </div>
        )}
      </div>
    </CandidateAppShell>
  );
}
