import Link from "next/link";
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
      <p style={{ margin: "0 0 9px", fontSize: 10, color: ARENA_V3.muted, letterSpacing: 3 }}>
        NEED{post.locationText ? ` · ${post.locationText}` : ""}
      </p>
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
