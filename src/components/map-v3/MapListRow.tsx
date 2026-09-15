import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import type { Post } from "@/lib/types";

export function MapListRow({ post, active, onSelect }: { post: Post; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 12,
        border: active ? `1px solid ${ARENA_V3.gold}` : "1px solid transparent",
        background: active ? "rgba(214,168,79,0.08)" : ARENA_V3.white,
        marginBottom: 8,
        cursor: "pointer",
      }}
    >
      <ChampagneAvatar name={post.authorName} sizePx={36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: ARENA_V3.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {post.authorName}
          </p>
          {post.demoContent && <DemoContentBadge />}
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {post.title || post.body}
        </p>
      </div>
      {post.distanceKm != null && (
        <span style={{ flexShrink: 0, fontSize: 10, color: ARENA_V3.muted }}>{post.distanceKm.toFixed(1)}km</span>
      )}
    </button>
  );
}
