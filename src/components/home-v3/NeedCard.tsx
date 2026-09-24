import Link from "next/link";
import { DemoContentBadge } from "./DemoContentBadge";
import type { Post } from "@/lib/types";

// ARENA-PHASE-1-BUILD.md §3.1 "Need card" - no image, deliberately: "card shape differs by
// content type; uniform cards are what made the old build read as generic."
export function NeedCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/feed/${post.id}`}
      style={{
        display: "block",
        background: "var(--card)",
        border: "1px solid var(--border)",
        margin: "0 12px 12px",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
        <p style={{ margin: 0, fontSize: 10, color: "var(--muted-foreground)", letterSpacing: 3 }}>
          NEED{post.locationText ? ` · ${post.locationText}` : ""}
        </p>
        {post.demoContent && <DemoContentBadge />}
      </div>
      <p
        className="font-display"
        style={{
          margin: 0,
          fontWeight: 500,
          fontSize: 17,
          lineHeight: 1.45,
          color: "var(--foreground)",
        }}
      >
        {post.title || post.body}
      </p>
    </Link>
  );
}
