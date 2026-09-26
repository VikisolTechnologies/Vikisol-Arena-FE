"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, ChevronRight, Flag, MapPin, MessageCircle, MoreHorizontal, Share2, XCircle } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { FollowButton } from "@/components/feed/FollowButton";
import { BlockButton } from "@/components/feed/BlockButton";
import { ReactionButton } from "@/components/feed/ReactionButton";
import { VoteControl } from "@/components/posts/VoteControl";
import { CommunityPostBar } from "@/components/discuss/CommunityPostBar";
import { MessageAuthorButton } from "@/components/discuss/MessageAuthorButton";
import { CommentThread } from "@/components/feed/CommentThread";
import { JoinRequestsPanel } from "@/components/feed/JoinRequestsPanel";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { RequirementDialog, requirementFromError, type Requirement } from "@/components/requirements/RequirementForm";
import { AppShell } from "@/components/app/AppShell";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { PostMedia } from "@/components/posts/PostMedia";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { formatEyebrowWhen } from "@/components/home-v3/format";
import { getMyProfile } from "@/lib/api/profile";
import { getPost, requestJoin, withdrawJoin, cancelPost, reportPost, savePost, unsavePost } from "@/lib/api/posts";
import { formatFriendlyDateTime } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { getSession } from "@/lib/session";
import type { CandidateProfile, Post } from "@/lib/types";

const VERIFICATION_LABEL: Record<string, string> = { basic: "Basic", phone: "Phone-verified", id: "ID-verified" };
const NEW_ACCOUNT_THRESHOLD_DAYS = 14;
// Same fallback used by ActivityCard for posts without their own photo - credited there.
const ACTIVITY_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1743601587751-01dc32b707d2";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Missing detail a join was refused for (date of birth / verified phone) - asked for in a
  // popup, then the join is retried.
  const [joinRequirement, setJoinRequirement] = useState<Requirement | null>(null);
  const [reported, setReported] = useState(false);
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [signInAction, setSignInAction] = useState("do that");
  // Clock is captured after paint so render stays pure. A missing start time means the
  // host can record an outcome immediately; a scheduled activity waits until that time.
  const [now, setNow] = useState<number | null>(null);

  const load = () => { getPost(params.id).then((p) => setPost(p ?? null)); };

  useEffect(() => {
    const clock = window.setTimeout(() => setNow(Date.now()), 0);
    if (getSession()) getMyProfile().then(setProfile);
    load();
    return () => window.clearTimeout(clock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const requireSignIn = (action: string) => {
    setSignInAction(action);
    setSignInPromptOpen(true);
  };

  if (post === undefined) {
    return (
      <AppShell bleed profile={profile}>
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (post === null) {
    return (
      <AppShell bleed profile={profile}>
        <p style={{ margin: "40px 20px", fontSize: 13, color: ARENA_V3.muted, textAlign: "center" }}>
          This post isn&apos;t available anymore.
        </p>
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
      const missing = requirementFromError(err);
      if (missing) setJoinRequirement(missing);
      else setJoinError(err instanceof Error ? err.message : "Couldn't request to join.");
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    setJoinError(null);
    try {
      await withdrawJoin(post.id);
      load();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't leave.");
    } finally {
      setLeaving(false);
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

  const report = async () => {
    if (!getSession()) { requireSignIn("report a post"); return; }
    await reportPost(post.id, "Reported from the post");
    setReported(true);
  };

  const toggleSave = async () => {
    if (!getSession()) { requireSignIn("save this"); return; }
    setSaving(true);
    const next = !saved;
    setSaved(next);
    try {
      await (next ? savePost(post.id) : unsavePost(post.id));
    } catch {
      setSaved(!next);
    } finally {
      setSaving(false);
    }
  };

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
  // A post with its own photos/videos shows them in full under the text (PostMedia); the stock
  // banner is only a fallback for an activity with none.
  const heroImage = post.mediaUrls.length === 0 && post.intentType === "activity" ? ACTIVITY_FALLBACK_IMAGE : null;
  const distanceKm =
    profile?.approxLat != null && profile?.approxLng != null && post.approxLat != null && post.approxLng != null
      ? haversineKm(profile.approxLat, profile.approxLng, post.approxLat, post.approxLng)
      : undefined;

  return (
    <AppShell bleed profile={profile}>
      <div style={{ flex: 1, paddingBottom: 24 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* SCREEN 4 "Image header" - 200px full-bleed; skipped (not faked) for posts with no
              media and no activity-style fallback, e.g. a plain Update - same "no image,
              deliberately" call NeedCard already makes for its card. */}
          {heroImage ? (
            <div style={{ position: "relative", height: 200, width: "100%", background: ARENA_V3.espressoLight }}>
              <Image src={heroImage} alt="" fill sizes="640px" style={{ objectFit: "cover" }} priority />
              <button
                type="button"
                onClick={() => router.push(post.intentType === "activity" ? "/map" : post.communitySlug ? `/discuss/c/${post.communitySlug}` : "/discuss")}
                style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", cursor: "pointer", color: "#ffffff" }}
                aria-label="Back"
              >
                <ArrowLeft size={20} strokeWidth={1.75} />
              </button>
              <MoreHorizontal size={20} strokeWidth={1.75} color="#ffffff" style={{ position: "absolute", top: 16, right: 16 }} />
            </div>
          ) : (
            <div style={{ padding: "16px 20px 0" }}>
              <button
                type="button"
                onClick={() => router.push(post.intentType === "activity" ? "/map" : post.communitySlug ? `/discuss/c/${post.communitySlug}` : "/discuss")}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: ARENA_V3.body, fontSize: 13, padding: 0 }}
              >
                <ArrowLeft size={16} strokeWidth={1.75} /> Back
              </button>
            </div>
          )}

          <div style={{ padding: "20px" }}>
            <CommunityPostBar post={post} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: 3, color: ARENA_V3.goldText }}>
                {post.intentType.toUpperCase()}{post.startsAt ? ` · ${formatEyebrowWhen(post.startsAt)}` : ""}
              </p>
              {post.demoContent && <DemoContentBadge />}
              {(post.status === "cancelled" || post.status === "expired" || post.status === "full") && (
                <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: 2, color: post.status === "full" ? ARENA_V3.muted : "#f87171" }}>
                  {post.status === "cancelled" ? "CANCELLED" : post.status === "expired" ? "EXPIRED" : "FULL"}
                </span>
              )}
            </div>

            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-arena-fraunces)", fontSize: 25, lineHeight: 1.2, color: ARENA_V3.ink }}>
              {post.title || post.body}
            </p>
            {post.title && (
              <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.8, color: ARENA_V3.body, whiteSpace: "pre-wrap" }}>{post.body}</p>
            )}

            <PostMedia urls={post.mediaUrls} className="mb-4" />

            {post.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {post.tags.map((t) => (
                  <span key={t} style={{ fontSize: 11, color: ARENA_V3.body, border: `1px solid ${ARENA_V3.hairline}`, borderRadius: 20, padding: "4px 10px" }}>#{t}</span>
                ))}
              </div>
            )}

            {/* Host row - an anonymous post shows only its alias: no profile link, no follow or
                block (those would all point at the real account), just report and a way to
                message the author without either side learning who the other is. */}
            {post.anonymous && !post.mine ? (
            <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${ARENA_V3.hairline}` }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: ARENA_V3.espressoLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {post.authorEmoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, color: ARENA_V3.ink }}>{post.authorName}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted }}>Posted anonymously</p>
              </div>
              <div data-theme="product" className="text-foreground" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <MessageAuthorButton post={post} />
                <button type="button" disabled={reported} onClick={report} aria-label="Report this post" title={reported ? "Reported" : "Report"} style={{ background: "none", border: "none", cursor: reported ? "default" : "pointer", color: reported ? "#f87171" : ARENA_V3.muted, padding: 4 }}>
                  <Flag size={14} strokeWidth={1.75} />
                </button>
              </div>
            </div>
            ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 11, paddingBottom: 16, marginBottom: 16, borderBottom: `1px solid ${ARENA_V3.hairline}` }}>
              <ChampagneAvatar name={post.authorName} sizePx={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {post.mine ? (
                  <p style={{ margin: 0, fontSize: 15, color: ARENA_V3.ink }}>
                    {post.authorName}
                    {post.anonymous && <span style={{ display: "block", fontSize: 12, color: ARENA_V3.muted }}>🎭 Posted anonymously - only you see it&apos;s yours</span>}
                  </p>
                ) : (
                  <Link
                    href={post.authorCompanyId ? `/companies/${post.authorCompanyId}` : `/people/${post.authorUserId}`}
                    style={{ fontSize: 15, color: ARENA_V3.ink, textDecoration: "none" }}
                  >
                    {post.authorName}
                  </Link>
                )}
                <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted }}>
                  {post.authorAccountAgeDays < NEW_ACCOUNT_THRESHOLD_DAYS ? `New here · joined ${post.authorAccountAgeDays}d ago` : `On Arena ${post.authorAccountAgeDays}d`}
                  {post.authorJoinCount > 0 && ` · ${post.authorJoinCount} sessions`}
                </p>
              </div>
              {!post.mine && <ChevronRight size={16} color="#a1a1aa" style={{ flexShrink: 0 }} />}
              {!post.mine && myUserId !== post.authorUserId && !post.authorCompanyId && (
                <div data-theme="product" className="text-foreground" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <FollowButton userId={post.authorUserId} />
                  <BlockButton userId={post.authorUserId} />
                  {post.intentType !== "activity" && <MessageAuthorButton post={post} />}
                  <button type="button" disabled={reported} onClick={report} aria-label="Report this post" title={reported ? "Reported" : "Report"} style={{ background: "none", border: "none", cursor: reported ? "default" : "pointer", color: reported ? "#f87171" : ARENA_V3.muted, padding: 4 }}>
                    <Flag size={14} strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Participants - real counts only; no fabricated avatar stack (no participant-list
                endpoint backs one - same "don't invent what isn't there" call as Map's dropped
                "People" filter). */}
            {post.joinable && (
              <p style={{ margin: "0 0 14px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>
                {post.spotsFilled > 0 ? `${post.spotsFilled} GOING` : "BE THE FIRST"}
                {spotsLeft !== undefined && post.status === "open" ? ` · ${spotsLeft} SPOT${spotsLeft === 1 ? "" : "S"} LEFT` : ""}
              </p>
            )}

            {(post.locationText || distanceKm != null || post.requiredVerificationLevel) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 14, fontSize: 12, color: ARENA_V3.body }}>
                {post.locationText && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {post.locationText}</span>}
                {distanceKm != null && <span>about {distanceKm.toFixed(1)} km away</span>}
                {post.requiredVerificationLevel && post.requiredVerificationLevel !== "basic" && (
                  <span style={{ color: ARENA_V3.goldText }}>{VERIFICATION_LABEL[post.requiredVerificationLevel]} required to join</span>
                )}
              </div>
            )}

            {/* Safety card */}
            {(post.exactMeetingPoint || post.joinable) && (
              <div style={{ background: ARENA_V3.white, borderRadius: 12, padding: 13, marginBottom: 16 }}>
                {distanceKm != null && <p style={{ margin: "0 0 4px", fontSize: 12, color: ARENA_V3.ink }}>about {distanceKm.toFixed(1)} km away</p>}
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: ARENA_V3.muted }}>
                  {post.exactMeetingPoint ? post.exactMeetingPoint : "Exact meeting point is shared once you're approved."}
                </p>
                {post.exactMeetingPoint && (
                  <>
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: ARENA_V3.muted }}>
                      For a first meetup, prefer a public place and daylight hours where possible.
                    </p>
                    <button
                      type="button"
                      onClick={sharePlan}
                      style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, background: "none", border: "none", cursor: "pointer", color: ARENA_V3.ink, fontSize: 11, fontWeight: 500, padding: 0 }}
                    >
                      <Share2 size={12} /> {shared ? "Copied to clipboard" : "Share this plan with someone"}
                    </button>
                  </>
                )}
              </div>
            )}

            {post.mine && !inactive && (post.status === "open" || post.status === "full") && (
              <button
                type="button"
                disabled={cancelling}
                onClick={cancel}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 12, padding: "0 0 16px" }}
              >
                <XCircle size={14} /> {cancelling ? "Cancelling…" : "Cancel this post"}
              </button>
            )}

            <div data-theme="product" className="text-foreground" style={{ marginBottom: post.mine || !post.joinable ? 0 : 16 }}>
              {/* Discussions are voted up/down (Discuss ranks by it); activities keep a simple like. */}
              {post.intentType === "activity" ? (
                <ReactionButton postId={post.id} reacted={!!post.myReacted} count={post.reactionCount} className="text-sm" />
              ) : (
                <VoteControl post={post} />
              )}
            </div>

            {/* Mine: join-requests panel to approve/decline. Not mine + joinable: the real CTA. */}
            {post.joinable && !inactive && post.mine && (
              <div data-theme="product" className="text-foreground" style={{ marginTop: 16 }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: ARENA_V3.ink }}>Join requests</p>
                <JoinRequestsPanel
                  postId={post.id}
                  onDecided={load}
                  recordOutcome={!post.startsAt || (now != null && new Date(post.startsAt).getTime() <= now)}
                />
              </div>
            )}

            {post.joinable && !post.mine && (
              <div style={{ marginTop: 16 }}>
                {inactive ? (
                  <p style={{ fontSize: 13, color: ARENA_V3.muted }}>
                    {post.status === "cancelled" ? "This was cancelled by the author." : "This activity has ended and is no longer joinable."}
                  </p>
                ) : post.myJoinStatus === "approved" ? (
                  <div>
                    <div style={{ display: "flex", gap: 10 }}>
                      {post.roomId ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/rooms/${post.roomId}`)}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: ARENA_V3.ink, color: ARENA_V3.ivory, fontSize: 14, padding: "14px 0", borderRadius: 26, border: "none", cursor: "pointer" }}
                        >
                          <MessageCircle size={16} /> Open room
                        </button>
                      ) : (
                        <p style={{ flex: 1, fontSize: 13, color: ARENA_V3.muted }}>You&apos;re in.</p>
                      )}
                      <BookmarkButton saved={saved} saving={saving} onClick={toggleSave} />
                    </div>
                    <button
                      type="button"
                      disabled={leaving}
                      onClick={leave}
                      style={{ marginTop: 10, background: "none", border: "none", cursor: leaving ? "default" : "pointer", color: "#f87171", fontSize: 12, padding: 0 }}
                    >
                      {leaving ? "Leaving…" : "Leave this activity"}
                    </button>
                    {joinError && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{joinError}</p>}
                  </div>
                ) : post.myJoinStatus === "pending" ? (
                  <div>
                    <p style={{ fontSize: 13, color: ARENA_V3.muted }}>Your request to join is waiting on approval.</p>
                    <button
                      type="button"
                      disabled={leaving}
                      onClick={leave}
                      style={{ marginTop: 8, background: "none", border: "none", cursor: leaving ? "default" : "pointer", color: "#f87171", fontSize: 12, padding: 0 }}
                    >
                      {leaving ? "Withdrawing…" : "Withdraw request"}
                    </button>
                    {joinError && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{joinError}</p>}
                  </div>
                ) : post.myJoinStatus === "declined" ? (
                  <p style={{ fontSize: 13, color: ARENA_V3.muted }}>Your request to join wasn&apos;t accepted this time.</p>
                ) : post.status === "full" ? (
                  <p style={{ fontSize: 13, color: ARENA_V3.muted }}>This one&apos;s full - check back if a spot opens up.</p>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        disabled={joining}
                        onClick={join}
                        style={{ flex: 1, fontSize: 14, fontWeight: 500, padding: "14px 0", borderRadius: 26, border: "none", background: ARENA_V3.ink, color: ARENA_V3.ivory, opacity: joining ? 0.6 : 1, cursor: joining ? "default" : "pointer" }}
                      >
                        {joining ? "Requesting…" : post.visibility === "public" ? "Join" : "Request to join"}
                      </button>
                      <BookmarkButton saved={saved} saving={saving} onClick={toggleSave} />
                    </div>
                    {joinError && (
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#f87171" }}>{joinError}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {!post.joinable && (
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <BookmarkButton saved={saved} saving={saving} onClick={toggleSave} />
              </div>
            )}
          </div>

          <div style={{ padding: "0 20px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: 10, letterSpacing: 3, color: ARENA_V3.muted }}>COMMENTS</p>
            <div data-theme="product" className="text-foreground" style={{ background: ARENA_V3.white, borderRadius: 14, padding: 14 }}>
              <CommentThread
                postId={post.id}
                postAuthorUserId={post.authorUserId}
                anonymousMode={post.intentType === "activity" ? undefined : post.anonymous && post.mine ? "forced" : "choice"}
              />
            </div>
          </div>
        </div>
      </div>

      <div data-theme="product" className="text-foreground">
        <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action={signInAction} />
        <RequirementDialog
          requirement={joinRequirement}
          onOpenChange={(open) => !open && setJoinRequirement(null)}
          onDone={() => {
            setJoinRequirement(null);
            join();
          }}
        />
      </div>
    </AppShell>
  );
}

function BookmarkButton({ saved, saving, onClick }: { saved: boolean; saving: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={saving}
      onClick={onClick}
      aria-label={saved ? "Remove from saved" : "Save this post"}
      style={{
        width: 46,
        height: 46,
        flexShrink: 0,
        borderRadius: "50%",
        border: `1px solid ${ARENA_V3.hairline}`,
        background: saved ? ARENA_V3.ink : "none",
        color: saved ? ARENA_V3.ivory : ARENA_V3.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: saving ? "default" : "pointer",
      }}
    >
      <Bookmark size={18} strokeWidth={1.75} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
