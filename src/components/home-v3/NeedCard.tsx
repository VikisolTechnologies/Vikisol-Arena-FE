import Link from "next/link";
import { DemoContentBadge } from "./DemoContentBadge";
import { ARENA_V3 } from "./tokens";
import type { Post } from "@/lib/types";

// ARENA-PHASE-1-BUILD.md §3.1 "Need card" - no image, deliberately: "card shape differs by
// content type; uniform cards are what made the old build read as generic."
export function NeedCard({ post, displayFont }: { post: Post; displayFont: string }) {
  return (
    <Link
      href={`/feed/${post.id}`}
      style={{
        display: "block",
        background: ARENA_V3.white,
        margin: "0 12px 12px",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
        <p style={{ margin: 0, fontSize: 10, color: ARENA_V3.muted, letterSpacing: 3 }}>
          NEED{post.locationText ? ` · ${post.locationText}` : ""}
        </p>
        {post.demoContent && <DemoContentBadge />}
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: displayFont,
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.35,
          color: ARENA_V3.ink,
        }}
      >
        {post.title || post.body}
      </p>
    </Link>
  );
}
