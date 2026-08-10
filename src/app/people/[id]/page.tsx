"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { PostCard } from "@/components/feed/PostCard";
import { FollowButton } from "@/components/feed/FollowButton";
import { BlockButton } from "@/components/feed/BlockButton";
import { getMyProfile, getPublicProfile } from "@/lib/api/profile";
import { getUserPosts } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import type { CandidateProfile, Post, PublicCandidateProfile } from "@/lib/types";

const VERIFICATION_LABEL: Record<string, string> = { basic: "Basic", phone: "Phone-verified", id: "ID-verified" };

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [myProfile, setMyProfile] = useState<CandidateProfile | null>(null);
  const [profile, setProfile] = useState<PublicCandidateProfile | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setMyProfile);
    getPublicProfile(params.id).then((p) => setProfile(p ?? null));
    getUserPosts(params.id).then((page) => setPosts(page.content));
  }, [params.id, router]);

  const myUserId = getSession()?.candidateId;

  // Own profile - redirect to the real self view rather than rendering a second, thinner copy.
  useEffect(() => {
    if (myUserId && myUserId === params.id) router.replace("/identity");
  }, [myUserId, params.id, router]);

  if (profile === undefined || !myProfile) {
    return (
      <AppShell title="Profile">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (profile === null) {
    return (
      <AppShell title="Profile">
        <p className="text-sm text-muted-foreground">This profile isn&apos;t available.</p>
      </AppShell>
    );
  }

  return (
    <AppShell profile={myProfile}>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      {/* Same cover+stats treatment as /identity (R1/R4's named Profile hero) - this is the
          same "Profile" screen type, just viewing someone else's. */}
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
                verified={profile.verificationLevel !== "basic"}
                className="champagne-ring ring-4 ring-surface"
              />
              <div className="pb-1">
                <h1 className="font-display text-xl font-bold tracking-tight">{profile.name}</h1>
                <p className="text-sm text-muted-foreground">{profile.title} · {profile.industry}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <FollowButton userId={profile.id} />
              <BlockButton userId={profile.id} />
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{profile.bio}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {(profile.location || profile.homeCity) && (
              <span className="flex items-center gap-1"><MapPin className="size-3" /> {profile.homeCity ?? profile.location}{profile.remote && " · Remote-friendly"}</span>
            )}
            <span>{profile.experienceYears}+ years experience</span>
            {profile.verificationLevel !== "basic" && (
              <span className="flex items-center gap-1 text-primary-soft"><ShieldCheck className="size-3" /> {VERIFICATION_LABEL[profile.verificationLevel]}</span>
            )}
            {profile.phoneVerified && <span className="flex items-center gap-1 text-primary-soft"><Phone className="size-3" /> Phone verified</span>}
          </div>

          {profile.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <Badge key={s.name} variant="secondary" className="bg-secondary text-[11px] text-muted-foreground">{s.name}</Badge>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-ink p-4 text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="champagne-ring flex size-11 items-center justify-center rounded-full bg-ink-800 text-sm font-bold text-champagne">
                {profile.careerHealth}
              </span>
              <span className="text-[11px] text-white/60">Arena Score</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold">{profile.followerCount}</span>
              <span className="text-[11px] text-white/60">Followers</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-lg font-bold">{profile.followingCount}</span>
              <span className="text-[11px] text-white/60">Following</span>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-3 mt-6 champagne-hairline font-display text-sm font-bold">Activity</p>
      {!posts ? (
        <OrbLoader className="h-48" />
      ) : posts.length === 0 ? (
        <EmptyState title="Nothing posted yet" className="py-12" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onClick={() => router.push(`/feed/${p.id}`)} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
