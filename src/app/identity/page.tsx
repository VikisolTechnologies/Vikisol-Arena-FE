"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Eye, ShieldCheck, Briefcase, GraduationCap, X, FileText, MapPin, Phone, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { ForceGraph } from "@/components/identity/ForceGraph";
import { SkillPicker } from "@/components/onboarding/SkillPicker";
import { ArenaCV } from "@/components/applications/ArenaCV";
import { ResumeUpload } from "@/components/applications/ResumeUpload";
import { DownloadPdfButton } from "@/components/applications/DownloadPdfButton";
import { PostCard } from "@/components/feed/PostCard";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyProfile, updateMySkills } from "@/lib/api/profile";
import { getMyFollowers, getMyFollowing } from "@/lib/api/follows";
import { getMyPosts } from "@/lib/api/posts";
import { getVerificationStatus } from "@/lib/api/verification";
import { requireOnboarded } from "@/lib/auth-guard";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CandidateProfile, FollowerEntry, Post, VerificationStatus } from "@/lib/types";

export default function IdentityPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [mode, setMode] = useState<"public" | "edit" | "resume" | "activity">("public");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [followers, setFollowers] = useState<FollowerEntry[]>([]);
  const [following, setFollowing] = useState<FollowerEntry[]>([]);
  const [followTab, setFollowTab] = useState<"followers" | "following">("followers");
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [myPosts, setMyPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then((p) => {
      setProfile(p);
      setDraftSkills(p.skills.map((s) => s.name));
      setSelectedId("me");
    });
    getMyFollowers().then(setFollowers);
    getMyFollowing().then(setFollowing);
    getVerificationStatus().then(setVerification);
  }, [router]);

  useEffect(() => {
    if (mode === "activity" && myPosts === null) getMyPosts().then(setMyPosts);
  }, [mode, myPosts]);

  if (!profile) {
    return (
      <AppShell title="Identity">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  const nodes = [
    { id: "me", label: profile.name, type: "center" as const },
    ...profile.skills.map((s) => ({ id: s.name, label: s.name, type: "skill" as const, verified: s.verified })),
    { id: "__exp", label: `${profile.experienceYears} yrs exp`, type: "meta" as const },
    { id: "__ind", label: profile.industry, type: "meta" as const },
  ];

  const selectedSkill = profile.skills.find((s) => s.name === selectedId);
  const selectedIsMeta = selectedId === "__exp" || selectedId === "__ind";

  const saveSkills = async () => {
    setSaving(true);
    const updated = await updateMySkills(draftSkills);
    setProfile(updated);
    setSaving(false);
    setMode("public");
  };

  return (
    <AppShell profile={profile}>
      {/* ARENA-VISUAL-RICHNESS.md R1/R4 - "Profile: full-bleed cover photo + a black stats/score
          block against the ivory," and "the portrait+score on Profile" as the named hero moment.
          Cover is a deterministic placeholder until real cover-photo upload exists (Step 4/9) -
          see PersonAvatar's own comment for the same reasoning. */}
      <div className="mb-5 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card-rest)]">
        <div className="relative h-32 sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element -- seeded placeholder cover */}
          <img
            src={`https://picsum.photos/seed/${encodeURIComponent(profile.id)}-cover/1200/320`}
            alt=""
            className="size-full object-cover"
          />
        </div>
        <div className="p-5">
          <div className="-mt-16 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <PersonAvatar
                seed={profile.id}
                name={profile.name}
                size="xl"
                verified={!!verification && verification.verificationLevel !== "basic"}
                className="champagne-ring ring-4 ring-surface"
              />
              <div className="pb-1">
                <h1 className="font-display text-xl font-bold tracking-tight">{profile.name}</h1>
                <p className="text-sm text-muted-foreground">{profile.title} · {profile.homeCity ?? profile.location}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {verification?.phoneVerified && (
              <span className="flex items-center gap-1 text-primary-soft"><Phone className="size-3" /> Phone verified</span>
            )}
            {profile.locationConsent && profile.locationConsent !== "off" && (
              <span className="flex items-center gap-1"><MapPin className="size-3" /> Location: {profile.locationConsent === "precise" ? "Precise" : "City-level"}</span>
            )}
          </div>

          {/* Black stats block - R1's contrast element, the Arena Score gets R8's champagne ring. */}
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-ink p-4 text-white">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="champagne-ring flex size-11 items-center justify-center rounded-full bg-ink-800 text-sm font-bold text-champagne">
                {profile.careerHealth}
              </span>
              <span className="text-[11px] text-white/60">Arena Score</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold">{followers.length}</span>
              <span className="text-[11px] text-white/60">Followers</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold">{following.length}</span>
              <span className="text-[11px] text-white/60">Following</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={mode === "public" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("public")}
          >
            <Eye className="size-3.5" /> Preview
          </Button>
          <Button
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("edit")}
          >
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button
            variant={mode === "activity" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("activity")}
          >
            <Sparkles className="size-3.5" /> Activity
          </Button>
          <Button
            variant={mode === "resume" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setMode("resume")}
          >
            <FileText className="size-3.5" /> Resume
          </Button>
        </div>
      </div>

      {mode === "resume" ? (
        <div className="mx-auto max-w-2xl space-y-4">
          <ResumeUpload profile={profile} onDone={setProfile} />
          <ArenaCV profile={profile} printable />
          <div className="flex justify-end">
            <DownloadPdfButton />
          </div>
        </div>
      ) : mode === "activity" ? (
        !myPosts ? (
          <OrbLoader className="h-64" />
        ) : myPosts.length === 0 ? (
          <EmptyState title="Nothing posted yet" description="Head to the Feed to publish your first post." className="py-16" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myPosts.map((p) => (
              <PostCard key={p.id} post={p} onClick={() => router.push(`/feed/${p.id}`)} />
            ))}
          </div>
        )
      ) : (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[24px] border border-border bg-card p-4">
          <ForceGraph nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
          <p className="mt-2 text-center text-xs text-muted-foreground">Drag a node to reposition it, or click to focus and zoom</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-card p-5">
            {selectedId === "me" && (
              <>
                <p className="font-display text-sm font-bold">{profile.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{profile.bio}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2">
                    <Briefcase className="size-3.5 text-primary-soft" /> {profile.experienceYears} yrs
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-2">
                    <GraduationCap className="size-3.5 text-primary-soft" /> {profile.industry}
                  </div>
                </div>
              </>
            )}
            {selectedSkill && (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-display text-sm font-bold">{selectedSkill.name}</p>
                  {selectedSkill.verified && <ShieldCheck className="size-4 text-success" />}
                </div>
                <Badge variant="secondary" className={`mt-2 ${selectedSkill.verified ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
                  {selectedSkill.verified ? "Verified via Challenges" : "Not yet verified"}
                </Badge>
                {mode === "edit" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-1.5"
                    onClick={() => setDraftSkills((prev) => prev.filter((s) => s !== selectedSkill.name))}
                  >
                    <X className="size-3.5" /> Remove skill
                  </Button>
                )}
              </>
            )}
            {selectedIsMeta && (
              <p className="text-sm text-muted-foreground">
                {selectedId === "__exp" ? `${profile.experienceYears} years of professional experience.` : `Working in ${profile.industry}.`}
              </p>
            )}
            {!selectedId && <p className="text-sm text-muted-foreground">Select a node to see details.</p>}
          </div>

          {mode === "edit" && (
            <div className="rounded-[24px] border border-border bg-card p-5">
              <p className="mb-3 champagne-hairline font-display text-sm font-bold">Edit skills</p>
              <SkillPicker selected={draftSkills} onChange={setDraftSkills} />
              <Button variant="default" size="sm" className="mt-3 w-full" disabled={saving} onClick={saveSkills}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </div>
      )}

      {mode !== "resume" && mode !== "activity" && (
        <Card className="mt-4">
          <div className="mb-3 flex gap-1.5">
            {(["followers", "following"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFollowTab(tab)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  followTab === tab ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                )}
              >
                {tab === "followers" ? `Followers (${followers.length})` : `Following (${following.length})`}
              </button>
            ))}
          </div>
          {(followTab === "followers" ? followers : following).length === 0 ? (
            <EmptyState
              title={followTab === "followers" ? "No followers yet" : "You're not following anyone yet"}
              description="Follow people from their posts in the Feed."
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {(followTab === "followers" ? followers : following).map((f) => (
                <div key={f.userId} className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-3.5 py-2.5">
                  <PersonAvatar seed={f.userId} name={f.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">since {formatDate(f.followedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
