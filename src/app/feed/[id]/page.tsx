"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, MapPin, MessageCircle, ShieldCheck, Users, XCircle } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/feed/FollowButton";
import { BlockButton } from "@/components/feed/BlockButton";
import { JoinRequestsPanel } from "@/components/feed/JoinRequestsPanel";
import { getMyProfile } from "@/lib/api/profile";
import { getPost, requestJoin, cancelPost } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { formatFriendlyDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { CandidateProfile, Post } from "@/lib/types";

const VERIFICATION_LABEL: Record<string, string> = { basic: "Basic", phone: "Phone-verified", id: "ID-verified" };

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

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
    setJoinError(null);
    try {
      await requestJoin(post.id);
      load();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't request to join.");
    } finally {
      setJoining(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelPost(post.id);
      load();
    } finally {
      setCancelling(false);
    }
  };

  const myUserId = getSession()?.candidateId;
  const inactive = post.status === "cancelled" || post.status === "expired";
  const spotsLeft = post.capacity ? Math.max(0, post.capacity - post.spotsFilled) : undefined;

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
            {(post.status === "cancelled" || post.status === "expired" || post.status === "full") && (
              <Badge variant="secondary" className={post.status === "full" ? "bg-white/5 text-[11px] text-muted-foreground" : "gap-1 bg-red-500/10 text-[11px] text-red-400"}>
                {post.status === "cancelled" && <XCircle className="size-3" />}
                {post.status === "cancelled" ? "Cancelled" : post.status === "expired" ? "Expired" : "Full"}
              </Badge>
            )}
            {!post.mine && myUserId !== post.authorUserId && (
              <div className="flex items-center gap-1.5">
                <FollowButton userId={post.authorUserId} />
                <BlockButton userId={post.authorUserId} />
              </div>
            )}
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
            {post.startsAt && <span className="flex items-center gap-1">Starts {formatFriendlyDateTime(post.startsAt)}</span>}
            {post.joinable && (
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {post.spotsFilled}{post.capacity ? `/${post.capacity}` : ""} joined
                {spotsLeft !== undefined && post.status === "open" && ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
              </span>
            )}
            {post.requiredVerificationLevel && post.requiredVerificationLevel !== "basic" && (
              <span className="flex items-center gap-1 text-primary-soft">
                <ShieldCheck className="size-3" /> {VERIFICATION_LABEL[post.requiredVerificationLevel]} required
              </span>
            )}
          </div>

          {post.exactMeetingPoint && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary-soft" />
              <div>
                <p className="text-xs font-semibold text-primary-soft">Meeting point</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{post.exactMeetingPoint}</p>
              </div>
            </div>
          )}

          {post.mine && !inactive && (post.status === "open" || post.status === "full") && (
            <Button variant="ghost-glass" size="sm" className="mt-4 gap-1.5 text-red-400" disabled={cancelling} onClick={cancel}>
              <XCircle className="size-3.5" /> {cancelling ? "Cancelling…" : "Cancel this post"}
            </Button>
          )}
        </Card>

        {post.joinable && (
          <Card>
            {inactive ? (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{post.status === "cancelled" ? "This was cancelled by the author." : "This activity has ended and is no longer joinable."}</span>
              </div>
            ) : post.mine ? (
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
            ) : post.status === "full" ? (
              <p className="text-sm text-muted-foreground">This one&apos;s full - check back if a spot opens up.</p>
            ) : (
              <>
                <Button variant="primary-gradient" size="cta" className="w-full" disabled={joining} onClick={join}>
                  {joining ? "Requesting…" : post.visibility === "public" ? "Join" : "Request to join"}
                </Button>
                {joinError && <p className="mt-2 text-xs text-red-400">{joinError}</p>}
              </>
            )}
          </Card>
        )}
      </div>
    </CandidateAppShell>
  );
}
