"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Send, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getConversations, getThreadMessages, sendThreadMessage, getOrCreateConversation, receiveThreadReply } from "@/lib/api/messages";
import { getCandidateById } from "@/lib/mock/candidates";
import type { Conversation, ThreadMessage } from "@/lib/types";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

const DRAFTS = [
  "Thanks for reaching out — happy to chat, what times work for you?",
  "Appreciate the update. Let me know if you need anything else from my side.",
  "Sounds great — looking forward to it.",
];

const AUTO_REPLIES = [
  "Sounds good, talk soon!",
  "Got it, thank you for the quick response.",
  "Appreciate the update.",
];

export function MessagesInbox() {
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");

  const loadConversations = () => getConversations().then(setConversations);

  useEffect(() => {
    (async () => {
      if (withParam) {
        const candidate = getCandidateById(withParam);
        const conv = await getOrCreateConversation(
          withParam,
          candidate?.name ?? "New contact",
          candidate?.avatarEmoji ?? "🧑",
          candidate ? "From Talent Universe" : undefined,
        );
        await loadConversations();
        setActiveId(conv.id);
      } else {
        const convs = await getConversations();
        setConversations(convs);
        if (convs[0]) setActiveId(convs[0].id);
      }
    })();
  }, [withParam]);

  useEffect(() => {
    if (!activeId) return;
    getThreadMessages(activeId).then(setThread);
  }, [activeId]);

  // Occasionally deliver a reply in the open thread so it feels alive.
  useEffect(() => {
    if (!activeId) return;
    const id = setInterval(() => {
      if (Math.random() < 0.4) {
        receiveThreadReply(activeId, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]);
        getThreadMessages(activeId).then(setThread);
        loadConversations();
      }
    }, 14000);
    return () => clearInterval(id);
  }, [activeId]);

  const active = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => c.participantName.toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    if (!draft.trim() || !activeId) return;
    await sendThreadMessage(activeId, draft);
    setDraft("");
    getThreadMessages(activeId).then(setThread);
    loadConversations();
  };

  return (
    <div className="glass-panel grid overflow-hidden rounded-[24px] border border-border bg-white/[0.02] lg:grid-cols-[300px_1fr]" style={{ height: "min(640px, 72vh)" }}>
      <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages..." className="border-border bg-white/[0.03] pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn("flex w-full items-center gap-3 border-b border-border/50 px-3.5 py-3 text-left transition-colors", c.id === activeId ? "bg-primary/10" : "hover:bg-white/[0.03]")}
            >
              <Avatar className="size-9"><AvatarFallback className="bg-white/5 text-sm">{c.participantEmoji}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.participantName}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.context}</p>
              </div>
              {c.unread && <span className="size-2 shrink-0 rounded-full bg-primary" />}
            </button>
          ))}
          {filtered.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No conversations found.</p>}
        </div>
      </div>

      <div className="flex flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar className="size-8"><AvatarFallback className="bg-white/5 text-sm">{active.participantEmoji}</AvatarFallback></Avatar>
              <div>
                <p className="text-sm font-medium">{active.participantName}</p>
                {active.context && <p className="text-xs text-muted-foreground">{active.context}</p>}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {thread.map((m) => (
                <div key={m.id} className={cn("flex", m.fromMe && "justify-end")}>
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm", m.fromMe ? "rounded-tr-sm bg-primary/15" : "rounded-tl-sm bg-white/[0.04]")}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {DRAFTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDraft(d)}
                    className="flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary-soft"
                  >
                    <Sparkles className="size-2.5" /> Draft
                  </button>
                ))}
              </div>
              <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message..." className="border-border bg-white/[0.03]" />
                <button type="submit" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90" aria-label="Send">
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a conversation</div>
        )}
      </div>
    </div>
  );
}
