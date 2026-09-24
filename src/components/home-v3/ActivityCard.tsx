import Image from "next/image";
import Link from "next/link";
import { ChampagneAvatar } from "./ChampagneAvatar";
import { DemoContentBadge } from "./DemoContentBadge";
import { formatEyebrowWhen } from "./format";
import type { Post } from "@/lib/types";

// ARENA-PHASE-1-BUILD.md §3.1 "Activity card" - image band, eyebrow (type + time), 20px serif
// headline, host row (champagne avatar + name + remaining spots), filled join pill.
//
// Fallback image credit (used only when the post has no mediaUrls of its own - most seed/demo
// posts don't yet): "A vibrant badminton court in front of a large building" by rishi
// (@beingabstrac) on Unsplash, https://unsplash.com/photos/USVxXkbgV64, Unsplash License (free
// to use). A real, licensed photograph, recorded here per §2's "record source and licence for
// everything that ships" - not a permanent choice, a placeholder for posts without their own
// photo the same way ChampagneAvatar is a placeholder for authors without one.
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1743601587751-01dc32b707d2";

export function ActivityCard({
  post,
  onJoin,
  joining,
}: {
  post: Post;
  onJoin: (post: Post) => void;
  joining: boolean;
}) {
  const spotsLeft = post.capacity != null ? Math.max(0, post.capacity - post.spotsFilled) : null;
  const imageUrl = post.mediaUrls[0] || FALLBACK_IMAGE;
  const pillLabel =
    post.myJoinStatus === "approved" ? "You're in" : post.myJoinStatus === "pending" ? "Requested" : joining ? "Joining…" : "Join";
  const pillDisabled = post.myJoinStatus === "approved" || post.myJoinStatus === "pending" || joining;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        margin: "0 12px 12px",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <Link href={`/feed/${post.id}`} style={{ display: "block" }}>
        <div style={{ position: "relative", height: 180, width: "100%", background: "#2F2F2F" }}>
          <Image src={imageUrl} alt="" fill sizes="400px" style={{ objectFit: "cover" }} />
        </div>
        <div style={{ padding: 14, paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
            <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", letterSpacing: 3 }}>
              ACTIVITY{post.startsAt ? ` · ${formatEyebrowWhen(post.startsAt)}` : ""}
            </p>
            {post.demoContent && <DemoContentBadge />}
          </div>
          <p
            className="font-display"
            style={{
              margin: "0 0 12px",
              fontWeight: 500,
              fontSize: 19,
              lineHeight: 1.4,
              color: "var(--foreground)",
            }}
          >
            {post.title || post.body}
          </p>
        </div>
      </Link>
      <div style={{ padding: "0 14px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <ChampagneAvatar name={post.authorName} sizePx={26} />
          <span style={{ fontSize: 12, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {post.authorName}
            {spotsLeft != null && ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
          </span>
        </div>
        <button
          type="button"
          disabled={pillDisabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onJoin(post);
          }}
          style={{
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 600,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            padding: "10px 22px",
            borderRadius: 999,
            border: "none",
            opacity: pillDisabled ? 0.55 : 1,
            cursor: pillDisabled ? "default" : "pointer",
          }}
        >
          {pillLabel}
        </button>
      </div>
    </div>
  );
}
