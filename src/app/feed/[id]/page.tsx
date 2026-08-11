"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Flag, MapPin, MessageCircle, Share2, ShieldCheck, Users, XCircle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/feed/FollowButton";
import { BlockButton } from "@/components/feed/BlockButton";
import { ReactionButton } from "@/components/feed/ReactionButton";
import { CommentThread } from "@/components/feed/CommentThread";
import { JoinRequestsPanel } from "@/components/feed/JoinRequestsPanel";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { getMyProfile } from "@/lib/api/profile";
import { getPost, requestJoin, cancelPost, reportPost } from "@/lib/api/posts";
import { formatFriendlyDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { CandidateProfile, Post } from "@/lib/types";

const VERIFICATION_LABEL: Record<string, string> = { basic: "Basic", phone: "Phone-verified", id: "ID-verified" };
const NEW_ACCOUNT_THRESHOLD_DAYS = 14;

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const [shared, setShared] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [signInAction, setSignInAction] = useState("do that");

  const load = () => { getPost(params.id).then((p) => setPost(p ?? null)); };

  // ARENA-STABILIZE.md Phase 2, G9 - shared post links are the growth loop; a logged-out
  // visitor must see the real post, not bounce to onboarding. getMyProfile() (AppShell's
  // sidebar account block) only fires when a session exists - GET /posts/{id} itself is now
  // permitAll'd and null-viewer-tolerant end to end (see PostController/PostMapper).
  useEffect(() => {
    if (getSession()) getMyProfile().then(setProfile);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const requireSignIn = (action: string) => {
    setSignInAction(action);
    setSignInPromptOpen(true);
  };

  if (post === undefined) {
    return (
      <AppShell title="Post">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (post === null) {
    return (
      <AppShell title="Post">
        <p className="text-sm text-muted-foreground">This post isn&apos;t available anymore.</p>
      </AppShell>
    );
  }

  const join = async () => {
    if (!getSession()) { requireSignIn(post.visibility === "public" ? "join" : "request to join"); return; }
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

  // §4 safety-audit fix: "report ... everywhere" - posts are directly reportable now, not just
  // via a Room (which UPDATE posts and not-yet-joined ACTIVITY/ASK posts never had at all).
  const report = async () => {
    if (!getSession()) { requireSignIn("report a post"); return; }
    await reportPost(post.id, "Reported from the post");
    setReported(true);
  };

  // §4's "share-my-plan (send room details to a trusted contact)" - no backend/contacts system
  // needed: assembles the same info already on this page into shareable text and hands it to
  // the OS share sheet (falls back to clipboard), so the user can send it to whoever they want
  // via WhatsApp/SMS/anything themselves.
  const sharePlan = async () => {
    const when = post.startsAt ? formatFriendlyDateTime(post.startsAt) : "time not set";
    const where = post.exactMeetingPoint || post.locationText || "location not set";
    const text = `I'm meeting up via Arena:\n"${post.body}"\nWith: ${post.authorName}\nWhen: ${when}\nWhere: ${where}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My meetup plan", text });
        return;
      } catch {
        // user cancelled the share sheet - fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const myUserId = getSession()?.candidateId;
  const inactive = post.status === "cancelled" || post.status === "expired";
  const spotsLeft = post.capacity ? Math.max(0, post.capacity - post.spotsFilled) : undefined;

  return (
    <AppShell title="Post" profile={profile}>
      {/* ARENA-STABILIZE.md Phase 3 - this page moved onto AppShell (Home/Discover/Map/Work/
          Inbox nav) in Phase 2's public-post-detail fix, but "back" still pointed at /feed - the
          older, now-orphaned CandidateAppShell-based list page, a jarring shell switch mid-flow.
          /home is this page's actual parent surface now (that's where every post link on the
          Golden Path originates from). */}
      <button
        type="button"
        onClick={() => router.push("/home")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Home
      </button>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{post.authorEmoji}</span>
            <div className="min-w-0 flex-1">
              {post.mine ? (
                <p className="text-sm font-semibold">{post.authorName}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(post.authorCompanyId ? `/companies/${post.authorCompanyId}` : `/people/${post.authorUserId}`)}
                  className="text-sm font-semibold hover:underline"
                >
                  {post.authorName}
                </button>
              )}
              <p className="text-xs text-muted-foreground">{formatFriendlyDateTime(post.createdAt)}</p>
            </div>
            {(post.status === "cancelled" || post.status === "expired" || post.status === "full") && (
              <Badge variant="secondary" className={post.status === "full" ? "bg-white/5 text-[11px] text-muted-foreground" : "gap-1 bg-red-500/10 text-[11px] text-red-400"}>
                {post.status === "cancelled" && <XCircle className="size-3" />}
                {post.status === "cancelled" ? "Cancelled" : post.status === "expired" ? "Expired" : "Full"}
              </Badge>
            )}
            {!post.mine && myUserId !== post.authorUserId && !post.authorCompanyId && (
              <div className="flex items-center gap-1.5">
                <FollowButton userId={post.authorUserId} />
                <BlockButton userId={post.authorUserId} />
                <Button variant="ghost-glass" size="icon-sm" disabled={reported} onClick={report} aria-label="Report this post" title={reported ? "Reported" : "Report"}>
                  <Flag className={reported ? "size-3.5 text-red-400" : "size-3.5"} />
                </Button>
              </div>
            )}
          </div>

          {post.joinable && !post.mine && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              {post.authorAccountAgeDays < NEW_ACCOUNT_THRESHOLD_DAYS ? (
                <span className="text-amber-400">New account (joined {post.authorAccountAgeDays}d ago)</span>
              ) : (
                <span>On Arena {post.authorAccountAgeDays}d</span>
              )}
              {post.authorJoinCount > 0 && (
                <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> {post.authorJoinCount} activities joined</span>
              )}
            </div>
          )}

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
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary-soft" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary-soft">Meeting point</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{post.exactMeetingPoint}</p>
                </div>
              </div>
              {/* §4 "in-room safety UX: public-place suggestions, share-my-plan" */}
              <p className="mt-2.5 text-[11px] text-muted-foreground">
                For a first meetup, prefer a public place and daylight hours where possible.
              </p>
              <button
                type="button"
                onClick={sharePlan}
                className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-primary-soft hover:underline"
              >
                <Share2 className="size-3" /> {shared ? "Copied to clipboard" : "Share this plan with someone"}
              </button>
            </div>
          )}

          {post.mine && !inactive && (post.status === "open" || post.status === "full") && (
            <Button variant="ghost-glass" size="sm" className="mt-4 gap-1.5 text-red-400" disabled={cancelling} onClick={cancel}>
              <XCircle className="size-3.5" /> {cancelling ? "Cancelling…" : "Cancel this post"}
            </Button>
          )}

          <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
            <ReactionButton postId={post.id} reacted={!!post.myReacted} count={post.reactionCount} className="text-sm" />
          </div>
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
                {joinError && (
                  <p className="mt-2 text-xs text-red-400">
                    {joinError}
                    {/* ARENA-STABILIZE.md Phase 2, G5 - found live: a fresh signup has no date
                        of birth on file (onboarding never asks), so joining/creating an
                        Activity 400s with a message pointing at Settings - but nothing actually
                        got them there. Same treatment as PostComposer's identical error. */}
                    {joinError.toLowerCase().includes("settings") && (
                      <> <button type="button" onClick={() => router.push("/settings")} className="font-medium text-primary-soft hover:underline">Go to Settings</button></>
                    )}
                  </p>
                )}
              </>
            )}
          </Card>
        )}
      </div>

      <Card className="mt-4">
        <p className="mb-3 font-display text-sm font-bold">Comments</p>
        <CommentThread postId={post.id} postAuthorUserId={post.authorUserId} />
      </Card>
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action={signInAction} />
    </AppShell>
  );
}
