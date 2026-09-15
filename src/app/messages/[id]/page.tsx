"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Briefcase } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { ChampagneAvatar } from "@/components/home-v3/ChampagneAvatar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { ThreadScreen, type ThreadMessageView } from "@/components/inbox-v3/ThreadScreen";
import { getConversations, getThreadMessages, sendThreadMessage } from "@/lib/api/messages";
import type { Conversation } from "@/lib/types";

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<ThreadMessageView[]>([]);

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

  return (
    <ThreadScreen
      backHref="/rooms"
      thumbnail={
        conversation.context ? (
          <div style={{ width: 34, height: 34, borderRadius: 11, background: ARENA_V3.champagne, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Briefcase size={15} strokeWidth={1.75} color={ARENA_V3.champagneText} />
          </div>
        ) : (
          <ChampagneAvatar name={conversation.participantName} sizePx={34} />
        )
      }
      title={conversation.participantName}
      subtitle={conversation.context || "Direct message"}
      messages={messages}
      onSend={send}
    />
  );
}
