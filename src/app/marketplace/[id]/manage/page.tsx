"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, Check, Sparkles, Star } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { getMyProfile } from "@/lib/api/profile";
import {
  getMyProject, awardProject, submitMilestoneDeliverable, acceptMilestone, submitProjectRating, type MyProject,
} from "@/lib/api/myProjects";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { CandidateProfile, Bid, Milestone } from "@/lib/types";

function MilestoneCard({ milestone, onSubmitDeliverable, onAccept }: {
  milestone: Milestone;
  onSubmitDeliverable: (id: string, note: string) => void;
  onAccept: (id: string) => void;
}) {
  const [note, setNote] = useState(milestone.deliverable?.note ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSubmitDeliverable(milestone.id, note);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-secondary px-4 py-3.5">
      <div className="flex items-center justify-between">
        <p className={cn("text-sm font-medium", milestone.done && "text-muted-foreground line-through")}>{milestone.label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{formatINR(milestone.amount)}</span>
          {milestone.done && <Check className="size-4 text-emerald-400" />}
        </div>
      </div>
      {!milestone.done && (
        <div className="mt-2.5 space-y-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Deliverable notes (filled in on the bidder's behalf in this preview)…"
            className="min-h-16 border-border bg-secondary text-xs"
          />
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save note"}
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              disabled={!milestone.deliverable && !note.trim()}
              onClick={async () => {
                if (note !== (milestone.deliverable?.note ?? "")) await onSubmitDeliverable(milestone.id, note);
                onAccept(milestone.id);
              }}
            >
              Accept &amp; release {formatINR(milestone.amount)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectManagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [project, setProject] = useState<MyProject | null | undefined>(undefined);
  const [confirmBid, setConfirmBid] = useState<Bid | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = () => getMyProject(params.id).then((p) => setProject(p ?? null));

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (project === undefined || !profile) {
    return (
      <AppShell title="Manage Project">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (project === null) {
    return (
      <AppShell title="Manage Project">
        <p className="text-sm text-muted-foreground">You can only manage projects you posted.</p>
      </AppShell>
    );
  }

  const doAward = async () => {
    if (!confirmBid) return;
    await awardProject(project.id, confirmBid.id);
    setConfirmBid(null);
    load();
  };

  const doSubmitDeliverable = async (milestoneId: string, note: string) => {
    await submitMilestoneDeliverable(project.id, milestoneId, note);
    load();
  };

  const doAccept = async (milestoneId: string) => {
    await acceptMilestone(project.id, milestoneId);
    load();
  };

  const doSubmitRating = async () => {
    setSubmittingRating(true);
    await submitProjectRating(project.id, { fromRole: "poster", rating: ratingValue, comment: ratingComment });
    setSubmittingRating(false);
    load();
  };

  const awardedBid = project.bids.find((b) => b.id === project.awardedBidId);
  const posterRating = project.ratings?.find((r) => r.fromRole === "poster");

  return (
    <AppShell profile={profile}>
      <button type="button" onClick={() => router.push(`/marketplace/${project.id}`)} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to project
      </button>

      <div className="mb-5 rounded-[24px] border border-border bg-card p-6">
        <h1 className="font-display text-xl font-bold tracking-tight">{project.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{project.bids.length} bids · Status: <span className="capitalize">{project.status}</span></p>
      </div>

      {project.status === "open" && (
        <>
          <p className="mb-3 champagne-hairline font-display text-sm font-bold">Compare bids</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.bids.map((bid, i) => (
              <div key={bid.id} className={cn("rounded-[24px] border p-5", i === 0 ? "border-primary/40 bg-primary/[0.05]" : "border-border bg-card")}>
                <div className="flex items-center justify-between">
                  <PersonAvatar seed={bid.id} name={bid.bidderName} size="default" />
                  {i === 0 && <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary-soft"><Sparkles className="size-3" /> agent pick</Badge>}
                </div>
                <p className="mt-2 text-sm font-semibold">{bid.bidderName}</p>
                <p className="font-display text-xl font-bold text-primary-soft">{formatINR(bid.amount)}</p>
                <p className="text-xs text-muted-foreground">{bid.matchPercentage}% match</p>
                <Button variant="default" size="sm" className="mt-3 w-full gap-1.5" onClick={() => setConfirmBid(bid)}>
                  <Award className="size-3.5" /> Award
                </Button>
              </div>
            ))}
            {project.bids.length === 0 && <p className="text-sm text-muted-foreground">No bids to compare yet.</p>}
          </div>
        </>
      )}

      {(project.status === "awarded" || project.status === "closed") && (
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            {awardedBid && <PersonAvatar seed={awardedBid.id} name={awardedBid.bidderName} size="default" />}
            <div>
              <p className="text-sm font-semibold">Awarded to {awardedBid?.bidderName}</p>
              <p className="text-xs text-muted-foreground">{awardedBid && formatINR(awardedBid.amount)}</p>
            </div>
            <Badge variant="secondary" className={cn("ml-auto", project.status === "closed" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/12 text-primary-soft")}>
              {project.status === "closed" ? "Complete" : "In progress"}
            </Badge>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones — deliverable per tranche</p>
          <div className="space-y-2.5">
            {project.milestones.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onSubmitDeliverable={doSubmitDeliverable} onAccept={doAccept} />
            ))}
          </div>

          {project.status === "closed" && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Star className="size-3.5" /> Rate {awardedBid?.bidderName}
              </p>
              {posterRating ? (
                <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn("size-3.5", i < posterRating.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                    ))}
                  </div>
                  {posterRating.comment && <p className="mt-1.5 text-muted-foreground">{posterRating.comment}</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-secondary p-4">
                  <p className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    Rating <span className="text-foreground">{ratingValue}/5</span>
                  </p>
                  <Slider value={ratingValue} onValueChange={(v) => setRatingValue(v as number)} min={1} max={5} step={1} className="mb-3" />
                  <Textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="How was working with them?"
                    className="mb-3 border-border bg-card text-sm"
                  />
                  <Button variant="default" size="sm" className="w-full" disabled={submittingRating} onClick={doSubmitRating}>
                    {submittingRating ? "Submitting…" : "Submit rating"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!confirmBid} onOpenChange={(open) => !open && setConfirmBid(null)}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Award this project?</DialogTitle>
            <DialogDescription>
              {confirmBid && `Awarding to ${confirmBid.bidderName} for ${formatINR(confirmBid.amount)}. This closes bidding.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmBid(null)}>Cancel</Button>
            <Button variant="default" size="sm" onClick={doAward}>Confirm award</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
