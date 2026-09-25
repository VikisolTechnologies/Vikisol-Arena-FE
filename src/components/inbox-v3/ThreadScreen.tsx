"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Plus, Send } from "lucide-react";
import { ARENA_V3 } from "@/components/home-v3/tokens";

export interface ThreadMessageView {
  id: string;
  fromMe: boolean;
  content: string;
  senderName?: string;
  createdAt: string;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(date) - start(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

/** SCREEN 6 "ROOM" - the one thread template shared by both real messaging systems (group
 *  Rooms and 1:1 Conversations). "There is exactly one messaging surface in the app" (SCREEN 5)
 *  is about this visual/UX unification, not about merging the two backends - Rooms stay
 *  join-gated group threads tied to a post, Conversations stay open 1:1 DMs; each route
 *  (/rooms/[id], /messages/[id]) supplies its own real data and passes it through this shell. */
export function ThreadScreen({
  thumbnail,
  title,
  subtitle,
  pinnedContext,
  messages,
  onSend,
  headerActions,
  backHref = "/rooms",
  notice,
  closedMessage,
}: {
  thumbnail: React.ReactNode;
  title: string;
  subtitle: string;
  pinnedContext?: string | null;
  messages: ThreadMessageView[];
  onSend: (content: string) => Promise<void> | void;
  headerActions?: React.ReactNode;
  backHref?: string;
  /** A line above the messages (e.g. "You're anonymous in this chat"). */
  notice?: React.ReactNode;
  /** Set when the chat is closed - replaces the composer. */
  closedMessage?: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft("");
    setSending(true);
    try {
      await onSend(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: 14, background: ARENA_V3.white, borderBottom: `1px solid ${ARENA_V3.hairlineCard}`, position: "sticky", top: 0, zIndex: 10 }}>
        <button type="button" onClick={() => router.push(backHref)} aria-label="Back to Inbox" style={{ background: "none", border: "none", cursor: "pointer", color: ARENA_V3.ink, padding: 4, marginLeft: -4 }}>
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        {thumbnail}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, color: ARENA_V3.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: ARENA_V3.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
        </div>
        {headerActions}
      </div>

      {/* Pinned context strip - keeps the post a Room belongs to permanently visible. */}
      {pinnedContext && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", background: "rgba(255,107,53,0.1)" }}>
          <MapPin size={15} strokeWidth={1.75} color="#ff8a5b" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#ffb38a" }}>{pinnedContext}</p>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, padding: "14px 14px 20px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {notice && (
          <div style={{ alignSelf: "center", maxWidth: 420, textAlign: "center", fontSize: 12, lineHeight: 1.5, color: ARENA_V3.muted, background: ARENA_V3.white, borderRadius: 12, padding: "8px 12px" }}>
            {notice}
          </div>
        )}
        {messages.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: ARENA_V3.muted, marginTop: 24 }}>No messages yet - say hello.</p>
        )}
        {messages.map((m, i) => {
          const label = dayLabel(m.createdAt);
          const showSeparator = i === 0 || label !== dayLabel(messages[i - 1].createdAt);
          return (
            <div key={m.id}>
              {showSeparator && (
                <p style={{ textAlign: "center", fontSize: 11, color: ARENA_V3.muted, margin: "6px 0 12px" }}>{label}</p>
              )}
              <div style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: 205 }}>
                  {!m.fromMe && m.senderName && (
                    <p style={{ margin: "0 0 3px 2px", fontSize: 11, color: ARENA_V3.muted }}>{m.senderName}</p>
                  )}
                  <div
                    style={{
                      background: m.fromMe ? ARENA_V3.ink : ARENA_V3.white,
                      color: m.fromMe ? ARENA_V3.ivory : ARENA_V3.ink,
                      borderRadius: m.fromMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      padding: "10px 13px",
                      fontSize: 14,
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {closedMessage ? (
        <div style={{ background: ARENA_V3.white, padding: "16px 14px", paddingBottom: "max(16px, env(safe-area-inset-bottom))", textAlign: "center", fontSize: 13, color: ARENA_V3.muted }}>
          {closedMessage}
        </div>
      ) : (
      /* Composer */
      <div style={{ background: ARENA_V3.white, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <Plus size={20} strokeWidth={1.75} color={ARENA_V3.muted} style={{ flexShrink: 0 }} />
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message..."
            style={{
              flex: 1,
              fontSize: 14,
              background: ARENA_V3.ivory,
              border: "none",
              borderRadius: 22,
              padding: "11px 15px",
              outline: "none",
              color: ARENA_V3.ink,
            }}
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" style={{ background: "none", border: "none", cursor: draft.trim() ? "pointer" : "default", color: ARENA_V3.ink, opacity: draft.trim() ? 1 : 0.4, padding: 4, flexShrink: 0 }}>
            <Send size={20} strokeWidth={1.75} />
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
