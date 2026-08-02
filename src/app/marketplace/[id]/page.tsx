"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock3, Sparkles, Settings2 } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getMyProfile } from "@/lib/api/profile";
import { getProject, placeBid } from "@/lib/api/market";
import { getMyProject, addBidToMyProject } from "@/lib/api/myProjects";
import { recordMyBid } from "@/lib/api/myBids";
import { useGsap } from "@/lib/gsap";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile, Project, Bid } from "@/lib/types";

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
  const [now, setNow] = useState<number | null>(null);
  const [bidding, setBidding] = useState(false);
  const [amount, setAmount] = useState("");
  const bidsListRef = useRef<HTMLDivElement>(null);
  const gsap = useGsap();

  const load = async () => {
    const mine = await getMyProject(params.id);
    if (mine) { setProject(mine); setIsMine(true); return; }
    const p = await getProject(params.id);
    setProject(p ?? null);
    setIsMine(false);
  };

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then(setProfile);
    getMyProject(params.id).then((mine) => {
      if (mine) { setProject(mine); setIsMine(true); return; }
      getProject(params.id).then((p) => { setProject(p ?? null); setIsMine(false); });
    });
  }, [params.id, router]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useGSAP(() => {
    if (!bidsListRef.current) return;
    gsap.from(bidsListRef.current.children, { opacity: 0, x: 24, duration: 0.5, stagger: 0.06, ease: "power2.out" });
  }, [project?.bids.length]);

  if (project === undefined || !profile) {
    return (
      <CandidateAppShell title="Project">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }
  if (project === null) {
    return (
      <CandidateAppShell title="Project">
        <p className="text-sm text-muted-foreground">This project isn&apos;t available anymore.</p>
      </CandidateAppShell>
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

  return (
    <CandidateAppShell profile={profile}>
      <button type="button" onClick={() => router.push("/marketplace")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Marketplace
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{project.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                ₹{project.budgetMin.toLocaleString("en-IN")}–₹{project.budgetMax.toLocaleString("en-IN")} · {project.durationWeeks} weeks · Posted by {project.postedBy}
              </p>
            </div>
            {isMine && (
              <Button variant="ghost-glass" size="sm" className="shrink-0 gap-1.5" onClick={() => router.push(`/marketplace/${project.id}/manage`)}>
                <Settings2 className="size-3.5" /> Manage
              </Button>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.skills.map((s) => <Badge key={s} variant="secondary" className="bg-white/5 text-muted-foreground">{s}</Badge>)}
          </div>
          <div
            className={`mt-5 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
              msLeft !== null && msLeft > 0 && msLeft < 3_600_000
                ? "border-amber-500/40 bg-amber-500/[0.07] animate-pulse"
                : "border-border bg-white/[0.02]"
            }`}
          >
            <Clock3 className="size-4 text-primary-soft" />
            {msLeft === null ? "—" : msLeft > 0 ? <>Ends in <b>{formatTimer(msLeft)}</b></> : "Bidding closed"}
          </div>

          {!isMine && (
            <Button variant="primary-gradient" size="cta" className="mt-5 w-full" onClick={() => setBidding(true)} disabled={msLeft === null || msLeft <= 0}>
              Place a bid
            </Button>
          )}
        </div>

        <div className="rounded-[24px] border border-border bg-white/[0.03] p-5">
          <p className="mb-3 font-display text-sm font-bold">Live bids ({project.bids.length})</p>
          <div ref={bidsListRef} className="space-y-2.5">
            {project.bids.map((bid, i) => (
              <div
                key={bid.id}
                className={`rounded-xl border px-3.5 py-3 transition-transform ${
                  i === 0
                    ? "border-primary/40 bg-primary/[0.06] scale-[1.02] shadow-[0_10px_28px_rgba(255,107,53,0.22)]"
                    : "border-border bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold">₹{bid.amount.toLocaleString("en-IN")}</span>
                  {i === 0 && (
                    <Badge variant="secondary" className="gap-1 bg-primary/15 text-primary-soft">
                      <Sparkles className="size-3" /> agent pick
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{bid.bidderEmoji} {bid.bidderName} · {bid.matchPercentage}% match</p>
              </div>
            ))}
            {project.bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet — be the first.</p>}
          </div>
        </div>
      </div>

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
              placeholder={`₹${project.budgetMin.toLocaleString("en-IN")}`}
              className="border-border bg-white/[0.03]"
            />
            <Button variant="primary-gradient" size="sm" className="w-full" onClick={submitBid} disabled={!amount}>
              Submit bid
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CandidateAppShell>
  );
}
