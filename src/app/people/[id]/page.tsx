"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Phone, ShieldCheck } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
      <CandidateAppShell title="Profile">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }
  if (profile === null) {
    return (
      <CandidateAppShell title="Profile">
        <p className="text-sm text-muted-foreground">This profile isn&apos;t available.</p>
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell profile={myProfile}>
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{profile.avatarEmoji}</span>
            <div>
              <p className="font-display text-lg font-bold">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.title} · {profile.industry}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <FollowButton userId={profile.id} />
            <BlockButton userId={profile.id} />
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{profile.bio}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
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
              <Badge key={s.name} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">{s.name}</Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span><span className="font-semibold text-foreground">{profile.followerCount}</span> followers</span>
          <span><span className="font-semibold text-foreground">{profile.followingCount}</span> following</span>
          <span><span className="font-semibold text-foreground">{profile.careerHealth}</span> career health</span>
        </div>
      </Card>

      <p className="mb-3 mt-6 font-display text-sm font-bold">Activity</p>
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
    </CandidateAppShell>
  );
}
