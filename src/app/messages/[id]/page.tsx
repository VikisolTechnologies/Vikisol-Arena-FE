"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Briefcase, Flag, XCircle } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { ThreadScreen, type ThreadMessageView } from "@/components/inbox-v3/ThreadScreen";
import { closeChat, getConversations, getThreadMessages, reportChat, sendThreadMessage } from "@/lib/api/messages";
import type { Conversation } from "@/lib/types";

const iconButton: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: ARENA_V3.muted, padding: 6, display: "flex" };

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<ThreadMessageView[]>([]);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    getConversations().then((convs) => setConversation(convs.find((c) => c.id === params.id) ?? null));
    getThreadMessages(params.id).then((msgs) => setMessages(msgs.map((m) => ({ id: m.id, fromMe: m.fromMe, content: m.content, createdAt: m.timestamp }))));
  }, [params.id]);

  const send = async (content: string) => {
    await sendThreadMessage(params.id, content);
    const fresh = await getThreadMessages(params.id);
    setMessages(fresh.map((m) => ({ id: m.id, fromMe: m.fromMe, content: m.content, createdAt: m.timestamp })));
  };

  if (conversation === undefined) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh" }}>
        <OrbLoader className="h-96" />
      </div>
    );
  }
  if (conversation === null) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", padding: 40 }}>
        <p style={{ fontSize: 13, color: ARENA_V3.muted, textAlign: "center" }}>This conversation isn&apos;t available.</p>
      </div>
    );
  }

  const isAnonymousChat = conversation.anonymous || conversation.meAnonymous;
  // Anonymous chats get their own safety tools: close (no more messages, and they can't open a
  // new anonymous chat with you) and report (goes to Arena's moderators, who can see who it is).
  const actions = isAnonymousChat ? (
    <div style={{ display: "flex", alignItems: "center" }}>
      {!conversation.closed && (
        <button
          type="button"
          aria-label="Close this chat"
          title="Close this chat"
          style={iconButton}
          onClick={async () => {
            if (!window.confirm("Close this chat? Neither of you can send more messages, and they can't start a new anonymous chat with you.")) return;
            setConversation(await closeChat(conversation.id));
          }}
        >
          <XCircle size={18} strokeWidth={1.75} />
        </button>
      )}
      <button
        type="button"
        aria-label="Report this chat"
        title={reported ? "Reported" : "Report this chat"}
        disabled={reported}
        style={{ ...iconButton, opacity: reported ? 0.4 : 1 }}
        onClick={async () => {
          const reason = window.prompt("What's wrong? Arena's moderators will review this chat.");
          if (reason === null) return;
          await reportChat(conversation.id, reason);
          setReported(true);
        }}
      >
        <Flag size={17} strokeWidth={1.75} />
      </button>
    </div>
  ) : undefined;

  const notice = conversation.meAnonymous
    ? "You're anonymous here - they see an alias, not your name or profile."
    : conversation.anonymous
      ? "They're anonymous - you see an alias. Arena's moderators can still act on reports."
      : undefined;

  return (
    <ThreadScreen
      backHref="/rooms"
      thumbnail={
        isAnonymousChat ? (
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: ARENA_V3.espressoLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {conversation.anonymous ? conversation.participantEmoji : "🎭"}
          </div>
        ) : conversation.context ? (
          <div style={{ width: 34, height: 34, borderRadius: 11, background: ARENA_V3.champagne, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Briefcase size={15} strokeWidth={1.75} color={ARENA_V3.champagneText} />
          </div>
        ) : (
          <ChampagneAvatar name={conversation.participantName} sizePx={34} />
        )
      }
      title={conversation.participantName}
      subtitle={conversation.context || (isAnonymousChat ? "Anonymous chat" : "Direct message")}
      messages={messages}
      onSend={send}
      headerActions={actions}
      notice={notice}
      closedMessage={conversation.closed ? "This chat was closed - no more messages can be sent." : null}
    />
  );
}
