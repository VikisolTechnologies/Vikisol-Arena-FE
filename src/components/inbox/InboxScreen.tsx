"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { HeartHandshake, Search, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { ButtonLink, Button } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { getMyRooms } from "@/lib/api/rooms";
import { getConversations, getOrCreateConversation } from "@/lib/api/messages";
import { getCandidateById } from "@/lib/mock/candidates";
import { requireOnboarded } from "@/lib/auth-guard";
import { timeAgo } from "@/lib/data/time";
import type { Conversation, Room } from "@/lib/types";
import { Cover } from "@/components/covers/Cover";
import { CompanyMark } from "@/components/career/CompanyMark";
import { isRealMode } from "@/lib/api/mode";
import { previewMediaForPost } from "@/lib/mock/posts";
import { JennyOrb } from "@/components/jenny/JennyOrb";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "activities", label: "Activities" },
  { id: "needs", label: "Needs" },
  { id: "jobs", label: "Jobs" },
  { id: "direct", label: "Direct" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

export type Thread =
  | { kind: "room"; id: string; sortAt: string; room: Room }
  | { kind: "direct" | "job"; id: string; sortAt: string; conversation: Conversation };

export function toThreads(rooms: Room[], conversations: Conversation[]): Thread[] {
  return [
    ...rooms.map((room): Thread => ({ kind: "room", id: room.id, sortAt: room.lastMessageAt, room })),
    ...conversations.map((c): Thread => ({ kind: c.context ? "job" : "direct", id: c.id, sortAt: c.lastMessageAt, conversation: c })),
  ].sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
}

function matches(t: Thread, f: Filter) {
  if (f === "all") return true;
  if (t.kind === "room") return (f === "activities" && t.room.postIntentType === "activity") || (f === "needs" && t.room.postIntentType === "ask");
  return (f === "jobs" && t.kind === "job") || (f === "direct" && t.kind === "direct");
}

/** Board "Messages, trust…" #1 — one Inbox for rooms and direct chats. */
export function InboxScreen() {
  const router = useRouter();
  const withParam = useSearchParams().get("with");
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    Promise.all([getMyRooms(), getConversations()])
      .then(([r, c]) => {
        if (cancelled) return;
        setRooms(Array.isArray(r) ? r : []);
        setConversations(Array.isArray(c) ? c : []);
        setError(false);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  // "Message this person" links elsewhere arrive as ?with=<id>: open or create the real
  // conversation, then go straight to its thread.
  useEffect(() => {
    if (!withParam) return;
    const candidate = getCandidateById(withParam);
    getOrCreateConversation(withParam, candidate?.name ?? "New contact", candidate?.avatarEmoji ?? "🧑").then((conv) => router.replace(`/messages/${conv.id}`));
  }, [withParam, router]);

  useEffect(() => {
    if (searching) searchInput.current?.focus();
  }, [searching]);

  const threads = useMemo(() => toThreads(rooms ?? [], conversations ?? []), [rooms, conversations]);
  const q = query.trim().toLowerCase();
  const shown = threads.filter((t) => matches(t, filter) && (!q || (t.kind === "room" ? t.room.postBody : `${t.conversation.participantName} ${t.conversation.context ?? ""}`).toLowerCase().includes(q)));
  const loading = !error && (rooms === null || conversations === null);

  return (
    <AppShell>
      <header className="flex items-center justify-between pt-3">
        <h1 className="font-display-serif text-[34px] font-medium leading-tight">Inbox</h1>
        <button
          type="button"
          onClick={() => {
            setSearching((s) => !s);
            setQuery("");
          }}
          aria-label={searching ? "Close search" : "Search conversations"}
          aria-expanded={searching}
          className="-mr-2 grid size-11 place-items-center rounded-full outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary"
        >
          {searching ? <X className="size-6" strokeWidth={1.75} aria-hidden /> : <Search className="size-6" strokeWidth={1.75} aria-hidden />}
        </button>
      </header>
      <AnimatePresence initial={false}>
        {searching && (
          <m.div key="search" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={fade}>
            <label className="mt-3 flex h-12 items-center gap-2.5 rounded-full border border-field-line bg-surface px-4 focus-within:border-primary">
              <Search className="size-5 text-faint" aria-hidden />
              <span className="sr-only">Search conversations</span>
              <input ref={searchInput} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint" />
            </label>
          </m.div>
        )}
      </AnimatePresence>
      <div className="mt-4">
        <Pills label="Show" options={FILTERS} value={filter} onChange={setFilter} compact />
      </div>

      <div className="mt-5 flex-1">
        {/* Jenny is pinned above the conversations (board), not one of them. */}
        {filter === "all" && !q && !error && <div className="border-b border-line"><JennyRow /></div>}
        {error ? (
          <StateCard kind="error" title="Your inbox didn't load" detail="Check your connection and try again." action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
        ) : loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading conversations">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full" />)}
          </div>
        ) : shown.length === 0 ? (
          q || filter !== "all" ? (
            <StateCard kind="empty" title="Nothing matches" detail={q ? "Try a different name or word." : "No conversations of this kind yet."} />
          ) : (
            <StateCard kind="empty" title="No messages yet" detail="Start a conversation by joining an activity, responding to a need or saying hi to someone nearby." action={<ButtonLink href="/discover">Discover nearby</ButtonLink>} />
          )
        ) : (
          <m.ul key={filter} initial="hidden" animate="shown" className="divide-y divide-line" aria-label="Conversations">
            {shown.map((t, i) => (
              <m.li key={`${t.kind}-${t.id}`} variants={rise} custom={i}>
                <ThreadRow thread={t} />
              </m.li>
            ))}
          </m.ul>
        )}
      </div>
    </AppShell>
  );
}

/** Board: Jenny sits at the top of the Inbox as her own thread, with the orb (never a photo). */
function JennyRow() {
  return (
    <Link href="/agent" className="flex min-h-[76px] items-center gap-3.5 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <JennyOrb size={56} online still />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold">Jenny</span>
        <span className="block truncate text-[14px] text-faint">{isRealMode() ? "Ask her to find, plan or draft something" : "Two things for your Saturday"}</span>
      </span>
      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[12px] font-semibold text-primary-soft">AI</span>
    </Link>
  );
}

const ROOM_ICON = { activity: Users, ask: HeartHandshake } as const;

function ThreadRow({ thread: t }: { thread: Thread }) {
  const href = t.kind === "room" ? `/rooms/${t.room.id}` : `/messages/${t.conversation.id}`;
  const unread = t.kind === "room" ? t.room.unread : t.conversation.unread;
  let thumb: React.ReactNode;
  let title: string;
  let preview: string;
  if (t.kind === "room") {
    const IconCmp = ROOM_ICON[t.room.postIntentType as keyof typeof ROOM_ICON] ?? Users;
    const media = isRealMode() ? undefined : previewMediaForPost(t.room.postId);
    thumb =
      t.room.postIntentType === "activity" || media ? (
        <Cover source={{ id: t.room.postId, kind: "activity", title: t.room.postBody, media }} className="size-14 shrink-0 rounded-xl" />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[radial-gradient(circle_at_30%_20%,var(--warning),var(--primary-pressed)_65%,var(--surface))] text-white">
          <IconCmp className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
      );
    title = t.room.postBody;
    preview = t.room.lastMessagePreview ?? `${t.room.memberCount} in the room`;
  } else {
    const c = t.conversation;
    thumb =
      t.kind === "job" ? (
        <CompanyMark name={c.participantName} className="size-14 rounded-full text-[18px]" />
      ) : (
        <Avatar name={c.participantName} className="size-14 text-[18px]" />
      );
    title = c.participantName;
    preview = `${c.meAnonymous ? "You're anonymous · " : ""}${c.closed ? "Closed · " : ""}${c.context || (c.anonymous || c.meAnonymous ? "Anonymous chat" : "Direct message")}`;
  }
  return (
    <Link href={href} className="flex min-h-[76px] items-center gap-3.5 py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      {thumb}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[16px]", unread ? "font-bold" : "font-semibold")}>{title}</span>
        <span className={cn("block truncate text-[14px]", unread ? "text-foreground" : "text-faint")}>{preview}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[12px] text-faint">{timeAgo(t.sortAt)}</span>
        {unread ? <span className="size-2.5 rounded-full bg-primary" aria-label="Unread" role="img" /> : <span className="size-2.5" aria-hidden />}
      </span>
    </Link>
  );
}
