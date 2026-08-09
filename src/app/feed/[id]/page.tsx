"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Users } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/feed/FollowButton";
import { JoinRequestsPanel } from "@/components/feed/JoinRequestsPanel";
import { getMyProfile } from "@/lib/api/profile";
import { getPost, requestJoin } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatFriendlyDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { CandidateProfile, Post } from "@/lib/types";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);

  const load = () => { getPost(params.id).then((p) => setPost(p ?? null)); };

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  if (post === undefined || !profile) {
    return (
      <CandidateAppShell title="Post">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }
  if (post === null) {
    return (
      <CandidateAppShell title="Post">
        <p className="text-sm text-muted-foreground">This post isn&apos;t available anymore.</p>
      </CandidateAppShell>
    );
  }

  const join = async () => {
    setJoining(true);
    try {
      await requestJoin(post.id);
      load();
    } finally {
      setJoining(false);
    }
  };

  const myUserId = getSession()?.candidateId;

  return (
    <CandidateAppShell profile={profile}>
      <button
        type="button"
        onClick={() => router.push("/feed")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Feed
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{post.authorEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">{formatFriendlyDateTime(post.createdAt)}</p>
            </div>
            {!post.mine && myUserId !== post.authorUserId && <FollowButton userId={post.authorUserId} />}
          </div>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Badge key={t} variant="secondary" className="bg-white/5 text-muted-foreground">#{t}</Badge>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {post.locationText && <span className="flex items-center gap-1"><MapPin className="size-3" /> {post.locationText}</span>}
            {post.joinable && (
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {post.spotsFilled}{post.capacity ? `/${post.capacity}` : ""} joined
              </span>
            )}
          </div>
        </Card>

        {post.joinable && (
          <Card>
            {post.mine ? (
              <>
                <p className="mb-3 font-display text-sm font-bold">Join requests</p>
                <JoinRequestsPanel postId={post.id} onDecided={load} />
              </>
            ) : post.myJoinStatus === "approved" && post.roomId ? (
              <>
                <p className="mb-2 font-display text-sm font-bold">You&apos;re in</p>
                <p className="mb-4 text-xs text-muted-foreground">Head to the room to coordinate.</p>
                <Button variant="primary-gradient" size="sm" className="w-full gap-1.5" onClick={() => router.push(`/rooms?open=${post.roomId}`)}>
                  <MessageCircle className="size-3.5" /> Open room
                </Button>
              </>
            ) : post.myJoinStatus === "pending" ? (
              <p className="text-sm text-muted-foreground">Your request to join is waiting on approval.</p>
            ) : post.myJoinStatus === "declined" ? (
              <p className="text-sm text-muted-foreground">Your request to join wasn&apos;t accepted this time.</p>
            ) : (
              <Button variant="primary-gradient" size="cta" className="w-full" disabled={joining} onClick={join}>
                {joining ? "Requesting…" : post.visibility === "public" ? "Join" : "Request to join"}
              </Button>
            )}
          </Card>
        )}
      </div>
    </CandidateAppShell>
  );
}
