import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { formatEyebrowWhen } from "@/components/home-v3/format";
import type { Post } from "@/lib/types";

// ARENA-MOCKUP-REFERENCE.md SCREEN 2 "Bottom sheet" - eyebrow (join policy), headline, time +
// coarse distance, the meeting-point gate sentence, host trust line, request pill.
export function MapDetailSheet({
  post,
  onJoin,
  onLeave,
  onViewPost,
  joining,
}: {
  post: Post;
  onJoin: () => void;
  onLeave: () => void;
  onViewPost: () => void;
  joining: boolean;
}) {
  const inOrPending = post.myJoinStatus === "approved" || post.myJoinStatus === "pending";
  const pillLabel = joining
    ? inOrPending ? "Leaving…" : "Requesting…"
    : post.myJoinStatus === "approved"
      ? "Leave"
      : post.myJoinStatus === "pending"
        ? "Withdraw"
        : post.visibility === "public"
          ? "Join"
          : "Request";
  const pillDisabled = joining;
  const canSeeExact = !!post.exactMeetingPoint;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, color: ARENA_V3.goldText, letterSpacing: 3 }}>
          {post.intentType.toUpperCase()} · {post.visibility === "approval" ? "APPROVAL REQUIRED" : "OPEN"}
        </p>
        {post.demoContent && <DemoContentBadge />}
      </div>
      <p style={{ margin: "0 0 10px", fontFamily: "var(--font-arena-fraunces)", fontSize: 21, lineHeight: 1.25, color: ARENA_V3.ink }}>
        {post.title || post.body}
      </p>
      <p style={{ margin: "0 0 4px", fontSize: 12, lineHeight: 1.8, color: ARENA_V3.body }}>
        {post.startsAt ? formatEyebrowWhen(post.startsAt) : "Ongoing"}
        {post.distanceKm != null && ` · about ${post.distanceKm.toFixed(1)} km away`}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 12, lineHeight: 1.8, color: ARENA_V3.body }}>
        {canSeeExact ? post.exactMeetingPoint : "Exact meeting point is shared once you're approved."}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <ChampagneAvatar name={post.authorName} sizePx={26} />
          <span style={{ fontSize: 12, color: ARENA_V3.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {post.authorName}
            {post.authorJoinCount > 0 && ` · ${post.authorJoinCount} joined before`}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={onViewPost}
            style={{ fontSize: 12, color: ARENA_V3.ink, background: "none", border: `1px solid ${ARENA_V3.hairline}`, borderRadius: 20, padding: "9px 14px", cursor: "pointer" }}
          >
            View
          </button>
          <button
            type="button"
            disabled={pillDisabled}
            onClick={inOrPending ? onLeave : onJoin}
            style={{
              fontSize: 13,
              background: ARENA_V3.ink,
              color: ARENA_V3.ivory,
              padding: "9px 20px",
              borderRadius: 20,
              border: "none",
              opacity: pillDisabled ? 0.55 : 1,
              cursor: pillDisabled ? "default" : "pointer",
            }}
          >
            {pillLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
