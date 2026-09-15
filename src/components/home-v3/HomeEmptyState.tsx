import Link from "next/link";
import { Users, HelpCircle, Briefcase, MessageCircle, type LucideIcon } from "lucide-react";
import { ARENA_V3 } from "./tokens";
import type { Post } from "@/lib/types";

// ARENA-FINISH-IT.md §2 - "A single line of grey text in an otherwise blank screen is a blank
// page with a sentence on it, not an empty state." Replaces exactly that. Every empty surface
// needs: a clear statement of what would appear here, one prominent action as a real button, and
// 3-4 suggested things to start as tappable cards using the same card shell as real content.
//
// "Never fabricate activity to fill the space. Suggestions and prompts are not fake content" -
// the distinction that makes these safe: each card is explicit about being a PROMPT to create
// something ("An activity", a description of what it means), never dressed up as a real post
// with a fake author/time/location the way ActivityCard/NeedCard render actual content. Same
// four intents, same order, as the Create screen spec (ARENA-MOCKUP-REFERENCE.md SCREEN 3) -
// this is the canonical "here's what you can start" list in this product, not a Home-specific
// invention.
const SUGGESTIONS: { icon: LucideIcon; label: string; description: string; intent?: Post["intentType"]; href?: string }[] = [
  { icon: Users, label: "An activity", description: "Something happening at a time and place", intent: "activity" },
  { icon: HelpCircle, label: "A need", description: "Ask for help, skills or people", intent: "ask" },
  { icon: Briefcase, label: "A project or job", description: "Paid work others can bid on", href: "/marketplace" },
  { icon: MessageCircle, label: "An update", description: "Share something with your network", intent: "update" },
];

export function HomeEmptyState({
  headline,
  description,
  primaryActionLabel,
  onPrimaryAction,
  onStartIntent,
}: {
  headline: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onStartIntent: (intent: Post["intentType"]) => void;
}) {
  return (
    <div style={{ margin: "0 12px 12px" }}>
      <div style={{ background: ARENA_V3.white, borderRadius: 14, padding: "24px 20px", textAlign: "center", marginBottom: 14 }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500, color: ARENA_V3.ink }}>{headline}</p>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: ARENA_V3.muted, lineHeight: 1.6 }}>{description}</p>
        <button
          type="button"
          onClick={onPrimaryAction}
          style={{
            fontSize: 13,
            background: ARENA_V3.ink,
            color: ARENA_V3.ivory,
            padding: "11px 26px",
            borderRadius: 24,
            border: "none",
            cursor: "pointer",
          }}
        >
          {primaryActionLabel}
        </button>
      </div>

      <p style={{ margin: "0 0 9px", fontSize: 10, color: ARENA_V3.muted, letterSpacing: 3, paddingLeft: 2 }}>OR START SOMETHING</p>
      {SUGGESTIONS.map((s) => {
        const Icon = s.icon;
        const content = (
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <Icon size={21} color={ARENA_V3.ink} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, color: ARENA_V3.ink }}>{s.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: ARENA_V3.muted }}>{s.description}</p>
            </div>
          </div>
        );
        const shellStyle = {
          display: "block" as const,
          background: ARENA_V3.white,
          borderRadius: 14,
          padding: 15,
          marginBottom: 9,
          cursor: "pointer",
        };
        return s.href ? (
          <Link key={s.label} href={s.href} style={shellStyle}>
            {content}
          </Link>
        ) : (
          <button key={s.label} type="button" onClick={() => onStartIntent(s.intent!)} style={{ ...shellStyle, width: "100%", border: "none", textAlign: "left" }}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
