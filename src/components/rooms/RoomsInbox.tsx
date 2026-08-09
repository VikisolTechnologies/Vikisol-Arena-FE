"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flag, Search, Send, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getMyRooms, getRoomMessages, sendRoomMessage, markRoomRead, reportRoom } from "@/lib/api/rooms";
import type { Room, RoomMessage } from "@/lib/types";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

const INTENT_LABEL: Record<Room["postIntentType"], string> = { activity: "Activity", ask: "Ask", update: "Update" };

export function RoomsInbox() {
  const searchParams = useSearchParams();
  const openParam = searchParams.get("open");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [reported, setReported] = useState(false);

  const loadRooms = () => getMyRooms().then(setRooms);

  useEffect(() => {
    loadRooms().then(() => {
      if (openParam) setActiveId(openParam);
    });
  }, [openParam]);

  useEffect(() => {
    if (!activeId) return;
    getRoomMessages(activeId).then(setMessages);
    markRoomRead(activeId).then(loadRooms);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate reset when switching rooms
    setReported(false);
  }, [activeId]);

  const active = rooms.find((r) => r.id === activeId);
  const filtered = rooms.filter((r) => r.postBody.toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    if (!draft.trim() || !activeId) return;
    await sendRoomMessage(activeId, draft);
    setDraft("");
    getRoomMessages(activeId).then(setMessages);
    loadRooms();
  };

  const report = async () => {
    if (!activeId) return;
    await reportRoom(activeId, "Reported from the room chat");
    setReported(true);
  };

  return (
    <div className="glass-panel grid overflow-hidden rounded-[24px] border border-border bg-white/[0.02] lg:grid-cols-[300px_1fr]" style={{ height: "min(640px, 72vh)" }}>
      <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rooms..." className="border-border bg-white/[0.03] pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveId(r.id)}
              className={cn("flex w-full items-start gap-3 border-b border-border/50 px-3.5 py-3 text-left transition-colors", r.id === activeId ? "bg-primary/10" : "hover:bg-white/[0.03]")}
            >
              <Avatar className="size-9"><AvatarFallback className="bg-white/5 text-sm"><Users className="size-4" /></AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{r.postBody}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(r.lastMessageAt)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{r.memberCount} in room {r.lastMessagePreview ? `· ${r.lastMessagePreview}` : ""}</p>
              </div>
              {r.unread && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))}
          {filtered.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No rooms yet - join a post to start one.</p>}
        </div>
      </div>

      <div className="flex flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar className="size-8"><AvatarFallback className="bg-white/5 text-sm"><Users className="size-4" /></AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{active.postBody}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-white/5 text-[10px] text-muted-foreground">{INTENT_LABEL[active.postIntentType]}</Badge>
                  <span className="text-xs text-muted-foreground">{active.memberCount} in room</span>
                </div>
              </div>
              <button
                type="button"
                onClick={report}
                disabled={reported}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label="Report this room"
              >
                <Flag className="size-3.5" /> {reported ? "Reported" : "Report"}
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.fromMe && "justify-end")}>
                  <div className={cn("max-w-[75%]", m.fromMe && "text-right")}>
                    {!m.fromMe && <p className="mb-0.5 text-[11px] text-muted-foreground">{m.senderEmoji} {m.senderName}</p>}
                    <div className={cn("inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm", m.fromMe ? "rounded-tr-sm bg-primary/15" : "rounded-tl-sm bg-white/[0.04]")}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message the room..." className="border-border bg-white/[0.03]" />
                <button type="submit" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90" aria-label="Send">
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a room</div>
        )}
      </div>
    </div>
  );
}
