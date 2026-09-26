"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Bell, BellOff, Flag, Users } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { ThreadScreen, type ThreadMessageView } from "@/components/inbox-v3/ThreadScreen";
import { getMyRooms, getRoomMessages, sendRoomMessage, markRoomRead, setRoomMuted, reportRoom } from "@/lib/api/rooms";
import { getPost } from "@/lib/api/posts";
import type { Room } from "@/lib/types";

const INTENT_LABEL: Record<Room["postIntentType"], string> = { activity: "Activity", ask: "Ask", update: "Update", company: "Company", offer: "Offer" };

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null | undefined>(undefined);
  const [messages, setMessages] = useState<ThreadMessageView[]>([]);
  const [pinnedContext, setPinnedContext] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    getMyRooms().then((rooms) => {
      const found = rooms.find((r) => r.id === params.id) ?? null;
      setRoom(found);
      if (found) {
        markRoomRead(found.id);
        getPost(found.postId).then((post) => {
          if (post) setPinnedContext(post.exactMeetingPoint || post.locationText || null);
        });
      }
    });
    getRoomMessages(params.id).then((msgs) =>
      setMessages(msgs.map((m) => ({ id: m.id, fromMe: m.fromMe, content: m.content, senderName: m.fromMe ? undefined : m.senderName, createdAt: m.createdAt }))),
    );
  }, [params.id]);

  const send = async (content: string) => {
    await sendRoomMessage(params.id, content);
    const fresh = await getRoomMessages(params.id);
    setMessages(fresh.map((m) => ({ id: m.id, fromMe: m.fromMe, content: m.content, senderName: m.fromMe ? undefined : m.senderName, createdAt: m.createdAt })));
  };

  const toggleMute = async () => {
    if (!room) return;
    await setRoomMuted(room.id, !room.muted);
    setRoom({ ...room, muted: !room.muted });
  };

  const report = async () => {
    await reportRoom(params.id, "Reported from the room chat");
    setReported(true);
  };

  if (room === undefined) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh" }}>
        <OrbLoader className="h-96" />
      </div>
    );
  }
  if (room === null) {
    return (
      <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", padding: 40 }}>
        <p style={{ fontSize: 13, color: ARENA_V3.muted, textAlign: "center" }}>This room isn&apos;t available.</p>
      </div>
    );
  }

  return (
    <ThreadScreen
      backHref="/rooms"
      thumbnail={
        <div style={{ width: 34, height: 34, borderRadius: 11, background: ARENA_V3.mapDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={15} strokeWidth={1.75} color={ARENA_V3.ink} />
        </div>
      }
      title={room.postBody}
      subtitle={`${INTENT_LABEL[room.postIntentType]} · ${room.memberCount} in room`}
      pinnedContext={pinnedContext}
      messages={messages}
      onSend={send}
      headerActions={
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={toggleMute} aria-label={room.muted ? "Unmute" : "Mute"} style={{ background: "none", border: "none", cursor: "pointer", color: ARENA_V3.muted, padding: 4 }}>
            {room.muted ? <BellOff size={16} strokeWidth={1.75} /> : <Bell size={16} strokeWidth={1.75} />}
          </button>
          <button type="button" onClick={report} disabled={reported} aria-label={reported ? "Reported" : "Report"} style={{ background: "none", border: "none", cursor: reported ? "default" : "pointer", color: reported ? "#f87171" : ARENA_V3.muted, padding: 4 }}>
            <Flag size={16} strokeWidth={1.75} />
          </button>
        </div>
      }
    />
  );
}
