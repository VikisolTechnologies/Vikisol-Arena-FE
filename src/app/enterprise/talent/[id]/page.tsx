"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, MessageCircle, ShieldCheck, Unlock, Bookmark } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyEnterpriseProfile, getCandidateDetail, unlockCandidate, hasDirectlyApplied } from "@/lib/api/enterprise";
import { getShortlistIds, toggleShortlist } from "@/lib/api/shortlist";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import { ApiError } from "@/lib/api/httpClient";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { Card } from "@/components/ui/card";
import type { EnterpriseProfile, CandidateProfile } from "@/lib/types";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [candidate, setCandidate] = useState<(CandidateProfile & { fullAccess: boolean }) | null | undefined>(undefined);
  const [freeUnlock, setFreeUnlock] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile);
    getCandidateDetail(params.id).then(async (c) => {
      setCandidate(c ?? null);
      setFreeUnlock(await hasDirectlyApplied(params.id));
      setSaved((await getShortlistIds()).includes(params.id));
    });
  }, [params.id, router]);

  if (candidate === undefined || !profile) {
    return (
      <EnterpriseAppShell title="Candidate">
        <OrbLoader className="h-96" />
      </EnterpriseAppShell>
    );
  }
  if (candidate === null) {
    return (
      <EnterpriseAppShell title="Candidate">
        <p className="text-sm text-muted-foreground">This candidate isn&apos;t visible — they may have turned off enterprise search.</p>
      </EnterpriseAppShell>
    );
  }

  const canUnlock = profile.unlockCreditsUsed < profile.unlockCreditsTotal;

  // Was fire-and-forget: marked the UI "unlocked" the instant the button was clicked,
  // regardless of whether the server call actually succeeded, and computed the new credit
  // balance client-side rather than trusting the server's own count. Now genuinely waits for
  // the real unlock to succeed, re-fetches both the candidate (so cvUrl/fullAccess reflect
  // what the server actually granted) and the enterprise profile (so the credit balance shown
  // is the server's real count, not a guess) - and surfaces a real error, without touching any
  // state, if the unlock fails (e.g. out of credits, a race with a teammate's own unlock).
  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      await unlockCandidate(candidate.id);
      const [freshCandidate, freshProfile] = await Promise.all([
        getCandidateDetail(candidate.id),
        getMyEnterpriseProfile(),
      ]);
      if (freshCandidate) setCandidate(freshCandidate);
      if (freshProfile) setProfile(freshProfile);
    } catch (err) {
      setUnlockError(err instanceof ApiError ? err.message : "Couldn't unlock this candidate — please try again.");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <EnterpriseAppShell profile={profile}>
      <button type="button" onClick={() => router.push("/enterprise/talent")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Talent Universe
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="flex items-start gap-4">
            <span className="text-4xl">{candidate.avatarEmoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold tracking-tight">{candidate.fullAccess ? candidate.name : "Candidate profile"}</h1>
              <p className="text-sm text-muted-foreground">{candidate.title} · {candidate.location}</p>
            </div>
            <button type="button" onClick={() => toggleShortlist(candidate.id).then((ids) => setSaved(ids.includes(candidate.id)))} aria-label="Save">
              <Bookmark className={cn("size-5", saved ? "fill-primary-soft text-primary-soft" : "text-muted-foreground")} />
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{candidate.bio}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <Badge key={s.name} variant="secondary" className="gap-1 bg-secondary text-muted-foreground">
                {s.name} {s.verified && <ShieldCheck className="size-3 text-emerald-400" />}
              </Badge>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">{candidate.experienceYears}</p>
              <p className="text-[11px] text-muted-foreground">Years exp.</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">{formatINR(candidate.rateFloor)}</p>
              <p className="text-[11px] text-muted-foreground">LPA floor</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">{candidate.careerHealth}%</p>
              <p className="text-[11px] text-muted-foreground">Career health</p>
            </div>
          </div>
        </Card>

        <div className="rounded-[24px] border border-border bg-secondary p-5">
          {candidate.fullAccess ? (
            <>
              <p className="mb-3 flex items-center gap-1.5 font-display text-sm font-bold text-emerald-400">
                <Unlock className="size-4" /> Contact unlocked
              </p>
              {freeUnlock && (
                <p className="mb-3 text-xs text-muted-foreground">
                  They applied directly to one of your postings, so contact is visible at no cost — unlock credits are only
                  for candidates you find via Talent Universe search.
                </p>
              )}
              {/* Arena doesn't collect a separate contact email/phone for candidates today - only
                  the resume itself (cvUrl) is gated behind unlock, which the "Message" action
                  below doesn't need. Was previously fabricating a name@example.com address here;
                  showing an address Arena never asked the candidate for was never honest, so this
                  routes to the real, working in-app messaging system instead. */}
              <p className="mb-3 text-xs text-muted-foreground">
                This candidate hasn&apos;t shared a direct contact email or phone through Arena — message them here instead.
              </p>
              <Button variant="primary-gradient" size="sm" className="w-full gap-1.5" onClick={() => router.push(`/messages?with=${candidate.id}`)}>
                <MessageCircle className="size-3.5" /> Message
              </Button>
            </>
          ) : (
            <>
              <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold">
                <Lock className="size-4 text-primary-soft" /> Contact locked
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                {candidate.name} consented to be discoverable, but their resume stays private until you unlock — costs 1 credit.
                {" "}{profile.unlockCreditsTotal - profile.unlockCreditsUsed} of {profile.unlockCreditsTotal} left.
              </p>
              {unlockError && <p className="mb-3 text-xs text-red-400">{unlockError}</p>}
              <Button variant="primary-gradient" size="sm" className="w-full gap-1.5" disabled={!canUnlock || unlocking} onClick={handleUnlock}>
                <Unlock className="size-3.5" /> {unlocking ? "Unlocking…" : canUnlock ? "Unlock contact" : "No credits left"}
              </Button>
            </>
          )}
        </div>
      </div>
    </EnterpriseAppShell>
  );
}
