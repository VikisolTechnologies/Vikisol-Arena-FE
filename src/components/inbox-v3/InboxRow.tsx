import Link from "next/link";
import { Briefcase, Users } from "lucide-react";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { ARENA_V3 } from "@/components/home-v3/tokens";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** SCREEN 5 "INBOX" thumbnail table, three real thread shapes:
 *  - "room": a group/activity Room - 44px rounded square, dark.
 *  - "job": a Conversation whose context names a role/project (see DemoContentService's own
 *    "bid thread" seed comment - that's literally what sets this apart, a non-null context, not
 *    a separate backend concept) - champagne square + briefcase.
 *  - "person": a plain Conversation with no context - champagne circle, initials (this app's
 *    standing "no photo, use initials" rule, same as everywhere else - not the flat #DCD2C4
 *    circle the mockup uses as a placeholder for a real avatar photo). */
export function InboxRow({
  href,
  kind,
  name,
  title,
  subtitle,
  timestamp,
  unread,
}: {
  href: string;
  kind: "room" | "job" | "person";
  name: string;
  title: string;
  subtitle: string;
  timestamp: string;
  unread: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 14,
        textDecoration: "none",
        borderBottom: `1px solid ${ARENA_V3.hairlineCard}`,
      }}
    >
      {kind === "room" ? (
        <div style={{ width: 44, height: 44, borderRadius: 14, background: ARENA_V3.mapDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={18} strokeWidth={1.75} color={ARENA_V3.ivory} />
        </div>
      ) : kind === "job" ? (
        <div style={{ width: 44, height: 44, borderRadius: 14, background: ARENA_V3.champagne, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Briefcase size={18} strokeWidth={1.75} color={ARENA_V3.champagneText} />
        </div>
      ) : (
        <ChampagneAvatar name={name} sizePx={44} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, color: ARENA_V3.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: ARENA_V3.muted }}>{timeAgo(timestamp)}</span>
        {unread && (
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: ARENA_V3.ink, color: ARENA_V3.ivory, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            •
          </span>
        )}
      </div>
    </Link>
  );
}
