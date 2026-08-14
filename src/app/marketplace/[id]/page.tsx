"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ArrowLeft, Clock3, Sparkles, Settings2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Check } from "lucide-react";
import { getMyProfile } from "@/lib/api/profile";
import { getProject, placeBid, submitMyDeliverable } from "@/lib/api/market";
import { getMyProject, addBidToMyProject } from "@/lib/api/myProjects";
import { recordMyBid, getMyBids } from "@/lib/api/myBids";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatINR, formatINRRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Project, Bid } from "@/lib/types";

const Animator = dynamic(() => import("./BidsListAnimator").then((m) => m.BidsListAnimator), { ssr: false });

function formatTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [isMine, setIsMine] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [deliverableNotes, setDeliverableNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [bidding, setBidding] = useState(false);
  const [amount, setAmount] = useState("");
  const bidsListRef = useRef<HTMLDivElement>(null);

  const load = () => {
    getMyProject(params.id).then((mine) => {
      if (mine) { setProject(mine); setIsMine(true); return; }
      getProject(params.id).then((p) => {
        setProject(p ?? null);
        setIsMine(false);
        if (p) {
          getMyBids().then((myBids) => {
            setIsWinner(myBids.some((b) => b.projectId === p.id && b.status === "won"));
          });
        }
      });
    });
  };

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);


  if (project === undefined || !profile) {
    return (
      <AppShell title="Project">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (project === null) {
    return (
      <AppShell title="Project">
        <p className="text-sm text-muted-foreground">This project isn&apos;t available anymore.</p>
      </AppShell>
    );
  }

  const msLeft = now === null ? null : new Date(project.endsAt).getTime() - now;

  const submitBid = async () => {
    const num = Number(amount);
    if (!num) return;
    if (isMine) return; // owners don't bid on their own project
    const bid: Bid | null = await placeBid(project.id, num, profile.name);
    if (bid) {
      recordMyBid({ bidId: bid.id, projectId: project.id, amount: num, status: "pending", submittedAt: bid.submittedAt });
      addBidToMyProject(project.id, bid); // no-op if not a "my" project, harmless
    }
    setBidding(false);
    setAmount("");
    load();
  };

  const submitDeliverable = async (milestoneId: string) => {
    setSubmittingId(milestoneId);
    await submitMyDeliverable(milestoneId, deliverableNotes[milestoneId] ?? "");
    setSubmittingId(null);
    load();
  };

  return (
    <AppShell profile={profile}>
      <button type="button" onClick={() => router.push("/marketplace")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Marketplace
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[24px] border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{project.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatINRRange(project.budgetMin, project.budgetMax)} · {project.durationWeeks} weeks · Posted by {project.postedBy}
              </p>
            </div>
            {isMine && (
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => router.push(`/marketplace/${project.id}/manage`)}>
                <Settings2 className="size-3.5" /> Manage
              </Button>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.skills.map((s) => <Badge key={s} variant="secondary" className="bg-secondary text-muted-foreground">{s}</Badge>)}
          </div>
          <div
            className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
              msLeft !== null && msLeft > 0 && msLeft < 3_600_000
                ? "border-amber-500/40 bg-amber-500/[0.07] animate-pulse"
                : "border-border bg-secondary"
            }`}
          >
            <Clock3 className="size-4 text-primary-soft" />
            {msLeft === null ? "—" : msLeft > 0 ? <>Ends in <b>{formatTimer(msLeft)}</b></> : "Bidding closed"}
          </div>

          {!isMine && (
            <Button variant="default" size="cta" className="mt-5 w-full" onClick={() => setBidding(true)} disabled={msLeft === null || msLeft <= 0}>
              Place a bid
            </Button>
          )}
        </div>

        <div className="rounded-[24px] border border-border bg-card p-5">
          <p className="mb-3 champagne-hairline font-display text-sm font-bold">Live bids ({project.bids.length})</p>
          <div ref={bidsListRef} className="space-y-2.5">
            {project.bids.map((bid, i) => (
              <div
                key={bid.id}
                className={`rounded-xl border px-3.5 py-3 transition-transform ${
                  i === 0
                    ? "border-primary/40 bg-primary/[0.06] scale-[1.02] shadow-[0_10px_28px_rgba(214,168,79,0.25)]"
                    : "border-border bg-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold">{formatINR(bid.amount)}</span>
                  {i === 0 && (
                    <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary-soft">
                      <Sparkles className="size-3" /> agent pick
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <PersonAvatar seed={bid.id} name={bid.bidderName} size="sm" />
                  <p className="text-xs text-muted-foreground">{bid.bidderName} · {bid.matchPercentage}% match</p>
                </div>
              </div>
            ))}
            {project.bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet — be the first.</p>}
          </div>
          <Animator bidsListRef={bidsListRef} bidsCount={project.bids.length} />
        </div>
      </div>

      {isWinner && project.milestones && project.milestones.length > 0 && (
        <div className="mt-4 rounded-[24px] border border-border bg-card p-6">
          <p className="mb-1 font-display text-sm font-bold">You won this project 🎉</p>
          <p className="mb-4 text-xs text-muted-foreground">Submit each milestone&apos;s deliverable — the poster reviews and releases payment per tranche.</p>
          <div className="space-y-2.5">
            {project.milestones.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-secondary px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm font-medium", m.done && "text-muted-foreground line-through")}>{m.label}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{formatINR(m.amount)}</span>
                    {m.done && <Check className="size-4 text-emerald-400" />}
                  </div>
                </div>
                {!m.done && (
                  <div className="mt-2.5 space-y-2">
                    {m.deliverable ? (
                      <p className="text-xs text-muted-foreground">Submitted — awaiting review: &ldquo;{m.deliverable.note}&rdquo;</p>
                    ) : (
                      <>
                        <Textarea
                          value={deliverableNotes[m.id] ?? ""}
                          onChange={(e) => setDeliverableNotes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                          placeholder="Describe what you're delivering for this milestone…"
                          className="min-h-16 border-border bg-secondary text-xs"
                        />
                        <Button
                          variant="default"
                          size="sm"
                          disabled={submittingId === m.id || !(deliverableNotes[m.id] ?? "").trim()}
                          onClick={() => submitDeliverable(m.id)}
                        >
                          {submittingId === m.id ? "Submitting…" : "Submit deliverable"}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={bidding} onOpenChange={setBidding}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Place a bid</DialogTitle>
            <DialogDescription>Your agent can suggest a competitive amount, or set your own.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={formatINR(project.budgetMin)}
              className="border-border bg-card"
            />
            <Button variant="default" size="sm" className="w-full" onClick={submitBid} disabled={!amount}>
              Submit bid
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
