"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, MessageCircle, ShieldCheck, Unlock, Bookmark } from "lucide-react";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyEnterpriseProfile, getCandidateDetail, unlockCandidate, saveMyEnterpriseProfile, getUnlockedCandidateIds, hasDirectlyApplied } from "@/lib/api/enterprise";
import { getShortlistIds, toggleShortlist } from "@/lib/api/shortlist";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { EnterpriseProfile, CandidateProfile } from "@/lib/types";

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(false);
  const [freeUnlock, setFreeUnlock] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then(setProfile);
    getCandidateDetail(params.id).then(async (c) => {
      setCandidate(c ?? null);
      const appliedDirectly = await hasDirectlyApplied(params.id);
      setFreeUnlock(appliedDirectly);
      setUnlocked(appliedDirectly || getUnlockedCandidateIds().includes(params.id));
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

  const handleUnlock = async () => {
    setUnlocking(true);
    unlockCandidate(candidate.id);
    const updated = { ...profile, unlockCreditsUsed: profile.unlockCreditsUsed + 1 };
    await saveMyEnterpriseProfile(updated);
    setProfile(updated);
    setUnlocked(true);
    setUnlocking(false);
  };

  return (
    <EnterpriseAppShell profile={profile}>
      <button type="button" onClick={() => router.push("/enterprise/talent")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Talent Universe
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <div className="flex items-start gap-4">
            <span className="text-4xl">{candidate.avatarEmoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-bold tracking-tight">{unlocked ? candidate.name : "Candidate profile"}</h1>
              <p className="text-sm text-muted-foreground">{candidate.title} · {candidate.location}</p>
            </div>
            <button type="button" onClick={() => toggleShortlist(candidate.id).then((ids) => setSaved(ids.includes(candidate.id)))} aria-label="Save">
              <Bookmark className={cn("size-5", saved ? "fill-primary-soft text-primary-soft" : "text-muted-foreground")} />
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{candidate.bio}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {candidate.skills.map((s) => (
              <Badge key={s.name} variant="secondary" className="gap-1 bg-white/5 text-muted-foreground">
                {s.name} {s.verified && <ShieldCheck className="size-3 text-emerald-400" />}
              </Badge>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">{candidate.experienceYears}</p>
              <p className="text-[11px] text-muted-foreground">Years exp.</p>
            </div>
            <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">₹{candidate.rateFloor}</p>
              <p className="text-[11px] text-muted-foreground">LPA floor</p>
            </div>
            <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-center">
              <p className="font-display text-lg font-bold">{candidate.careerHealth}%</p>
              <p className="text-[11px] text-muted-foreground">Career health</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-white/[0.03] p-5">
          {unlocked ? (
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
              <p className="mb-1 text-xs text-muted-foreground">Email</p>
              <p className="mb-3 text-sm">{candidate.name.toLowerCase().replace(" ", ".")}@example.com</p>
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
                {candidate.name} consented to be discoverable, but contact details stay private until you unlock — costs 1 credit.
                {" "}{profile.unlockCreditsTotal - profile.unlockCreditsUsed} of {profile.unlockCreditsTotal} left.
              </p>
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
