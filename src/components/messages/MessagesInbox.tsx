"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Search, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { Avatar } from "@/components/bplus/Avatar";
import { StateCard } from "@/components/bplus/Primitives";
import { getConversations, getOrCreateConversation, getThreadMessages, receiveThreadReply, sendThreadMessage } from "@/lib/api/messages";
import { isRealMode } from "@/lib/api/mode";
import { timeAgo } from "@/lib/data/time";
import { getCandidateById } from "@/lib/mock/candidates";
import type { Conversation, ThreadMessage } from "@/lib/types";

/** Plain quick replies (typed by us, not generated) — tapping one only fills the box. */
const QUICK = ["Thanks for applying — could we talk this week?", "What times work for you?", "Thanks, I'll get back to you by tomorrow."];
const AUTO_REPLIES = ["Sounds good, talk soon!", "Got it, thank you for the quick response.", "Appreciate the update."];

/**
 * Arena for Business — Messages (flow §8; no board — designed in B+). Same messages API calls.
 * Two panes on desktop; list → thread with Back on phones. `?with=<candidateId>` opens (or
 * starts) that conversation. Who can be messaged is enforced by the server.
 */
export function MessagesInbox() {
  const withParam = useSearchParams().get("with");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showThread, setShowThread] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const loadConversations = () => getConversations().then(setConversations);

  useEffect(() => {
    (async () => {
      try {
        if (withParam) {
          const candidate = getCandidateById(withParam);
          const conv = await getOrCreateConversation(withParam, candidate?.name ?? "New contact", candidate?.avatarEmoji ?? "", candidate ? "From Talent" : undefined);
          await loadConversations();
          setActiveId(conv.id);
          setShowThread(true);
        } else {
          const convs = await getConversations();
          setConversations(convs);
          if (convs[0]) setActiveId(convs[0].id);
        }
      } catch {
        setConversations([]);
        setError("Messages didn't load. Refresh to try again.");
      }
    })();
  }, [withParam]);

  useEffect(() => {
    if (!activeId) return;
    getThreadMessages(activeId).then(setThread).catch(() => setThread([]));
  }, [activeId]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [thread]);

  // Mock mode only: an occasional reply so the demo feels alive. Real threads show server data.
  useEffect(() => {
    if (!activeId || isRealMode()) return;
    const id = setInterval(() => {
      if (Math.random() < 0.4) {
        receiveThreadReply(activeId, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]);
        getThreadMessages(activeId).then(setThread);
        getConversations().then(setConversations);
      }
    }, 14000);
    return () => clearInterval(id);
  }, [activeId]);

  const active = conversations?.find((c) => c.id === activeId);
  const filtered = (conversations ?? []).filter((c) => c.participantName.toLowerCase().includes(search.toLowerCase()));

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    setSending(true);
    setError("");
    try {
      await sendThreadMessage(activeId, text);
      setDraft("");
      setThread(await getThreadMessages(activeId));
      void loadConversations();
    } catch {
      setError("Not sent. Your message is still in the box.");
    } finally {
      setSending(false);
    }
  };

  if (conversations && conversations.length === 0 && !error) {
    return <StateCard kind="empty" title="No messages yet" detail="You can message people who applied to your jobs, or people you've unlocked in Talent." />;
  }

  return (
    <div className="grid overflow-hidden rounded-tile border border-line bg-surface lg:grid-cols-[320px_1fr]" style={{ height: "min(680px, calc(100svh - 220px))" }}>
      <div className={cn("flex min-h-0 flex-col border-line lg:border-r", showThread && "hidden lg:flex")}>
        <label className="relative m-3">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" className="min-h-11 w-full rounded-full border border-field-line bg-transparent pl-9 pr-3 text-[15px] outline-none focus-visible:border-primary" />
        </label>
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversations">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => { setActiveId(c.id); setShowThread(true); }}
                aria-current={c.id === activeId ? "true" : undefined}
                className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors duration-200", c.id === activeId ? "bg-foreground/8" : "hover:bg-foreground/5")}
              >
                <Avatar name={c.participantName} className="size-10 text-[14px]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-[15px]", c.unread ? "font-bold" : "font-medium")}>{c.participantName}</span>
                    <span className="shrink-0 text-[12px] text-faint">{timeAgo(c.lastMessageAt)}</span>
                  </span>
                  {c.context && <span className="block truncate text-[13px] text-faint">{c.context}</span>}
                </span>
                {c.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="unread" />}
              </button>
            </li>
          ))}
          {conversations && filtered.length === 0 && <li className="p-4 text-center text-[14px] text-faint">No one by that name.</li>}
        </ul>
      </div>

      <div className={cn("flex min-h-0 flex-col", !showThread && "hidden lg:flex")}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-line px-3 py-2.5">
              <button type="button" onClick={() => setShowThread(false)} aria-label="Back to conversations" className="grid size-11 place-items-center rounded-full hover:bg-foreground/8 lg:hidden"><ArrowLeft className="size-5" aria-hidden /></button>
              <Avatar name={active.participantName} className="size-9 text-[13px]" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{active.participantName}</p>
                {active.context && <p className="truncate text-[13px] text-faint">{active.context}</p>}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
              <AnimatePresence initial={false}>
                {thread.map((msg) => (
                  <m.div key={msg.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle} className={cn("flex", msg.fromMe && "justify-end")}>
                    <p className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug", msg.fromMe ? "rounded-br-md bg-paper text-paper-ink" : "rounded-bl-md bg-foreground/8")}>{msg.content}</p>
                  </m.div>
                ))}
              </AnimatePresence>
              {thread.length === 0 && <p className="pt-8 text-center text-[14px] text-faint">Say hello — keep it about the role.</p>}
              <div ref={end} />
            </div>
            <div className="border-t border-line p-3">
              <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
                {QUICK.map((q) => <button key={q} type="button" onClick={() => setDraft(q)} className="shrink-0 rounded-full border border-field-line px-3 py-1.5 text-[13px] text-foreground/85 hover:bg-foreground/5">{q}</button>)}
              </div>
              {error && <p role="alert" className="mb-2 text-[14px] text-danger-on-dark">{error}</p>}
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                <label className="flex-1">
                  <span className="sr-only">Message {active.participantName}</span>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={1} placeholder="Write a message" className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-field-line bg-transparent px-3.5 py-2.5 text-[15px] outline-none focus-visible:border-primary" />
                </label>
                <m.button type="submit" whileTap={press} transition={spring.snappy} disabled={sending || !draft.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-paper-ink disabled:opacity-50">
                  <Send className="size-5" aria-hidden />
                </m.button>
              </form>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-[15px] text-faint">{error || "Choose a conversation"}</div>
        )}
      </div>
    </div>
  );
}
