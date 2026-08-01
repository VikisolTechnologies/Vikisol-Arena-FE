"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, Check, Sparkles } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getMyProfile } from "@/lib/api/profile";
import { getMyProject, awardProject, toggleMilestone, type MyProject } from "@/lib/api/myProjects";
import { getSession, isOnboarded } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Bid } from "@/lib/types";

export default function ProjectManagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [project, setProject] = useState<MyProject | null | undefined>(undefined);
  const [confirmBid, setConfirmBid] = useState<Bid | null>(null);

  const load = () => getMyProject(params.id).then((p) => setProject(p ?? null));

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then(setProfile);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (project === undefined || !profile) {
    return (
      <CandidateAppShell title="Manage Project">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }
  if (project === null) {
    return (
      <CandidateAppShell title="Manage Project">
        <p className="text-sm text-muted-foreground">You can only manage projects you posted.</p>
      </CandidateAppShell>
    );
  }

  const doAward = () => {
    if (!confirmBid) return;
    awardProject(project.id, confirmBid.id);
    setConfirmBid(null);
    load();
  };

  const doToggleMilestone = (milestoneId: string) => {
    toggleMilestone(project.id, milestoneId);
    load();
  };

  const awardedBid = project.bids.find((b) => b.id === project.awardedBidId);

  return (
    <CandidateAppShell profile={profile}>
      <button type="button" onClick={() => router.push(`/marketplace/${project.id}`)} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to project
      </button>

      <div className="mb-5 rounded-[24px] border border-border bg-white/[0.03] p-6">
        <h1 className="font-display text-xl font-bold tracking-tight">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.bids.length} bids · Status: <span className="capitalize">{project.status}</span></p>
      </div>

      {project.status === "open" && (
        <>
          <p className="mb-3 font-display text-sm font-bold">Compare bids</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.bids.map((bid, i) => (
              <div key={bid.id} className={cn("rounded-[24px] border p-5", i === 0 ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-white/[0.03]")}>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{bid.bidderEmoji}</span>
                  {i === 0 && <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary-soft"><Sparkles className="size-3" /> agent pick</Badge>}
                </div>
                <p className="mt-2 text-sm font-semibold">{bid.bidderName}</p>
                <p className="font-display text-xl font-bold text-primary-soft">₹{bid.amount.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">{bid.matchPercentage}% match</p>
                <Button variant="primary-gradient" size="sm" className="mt-3 w-full gap-1.5" onClick={() => setConfirmBid(bid)}>
                  <Award className="size-3.5" /> Award
                </Button>
              </div>
            ))}
            {project.bids.length === 0 && <p className="text-sm text-muted-foreground">No bids to compare yet.</p>}
          </div>
        </>
      )}

      {(project.status === "awarded" || project.status === "closed") && (
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xl">{awardedBid?.bidderEmoji}</span>
            <div>
              <p className="text-sm font-semibold">Awarded to {awardedBid?.bidderName}</p>
              <p className="text-xs text-muted-foreground">₹{awardedBid?.amount.toLocaleString("en-IN")}</p>
            </div>
            <Badge variant="secondary" className={cn("ml-auto", project.status === "closed" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/12 text-primary-soft")}>
              {project.status === "closed" ? "Complete" : "In progress"}
            </Badge>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</p>
          <div className="space-y-2">
            {project.milestones.map((m) => (
              <label key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-white/[0.02] px-3.5 py-2.5 text-sm">
                <Checkbox checked={m.done} onCheckedChange={() => doToggleMilestone(m.id)} />
                <span className={cn(m.done && "text-muted-foreground line-through")}>{m.label}</span>
                {m.done && <Check className="ml-auto size-4 text-emerald-400" />}
              </label>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!confirmBid} onOpenChange={(open) => !open && setConfirmBid(null)}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Award this project?</DialogTitle>
            <DialogDescription>
              {confirmBid && `Awarding to ${confirmBid.bidderName} for ₹${confirmBid.amount.toLocaleString("en-IN")}. This closes bidding.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost-glass" size="sm" onClick={() => setConfirmBid(null)}>Cancel</Button>
            <Button variant="primary-gradient" size="sm" onClick={doAward}>Confirm award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CandidateAppShell>
  );
}
