"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Bell, BellOff, CalendarDays, Flag, LogOut, MapPin, Pin, SendHorizontal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { ButtonLink } from "@/components/bplus/Button";
import { getMyRooms, getRoomMembers, getRoomMessages, markRoomRead, reportRoom, sendRoomMessage, setRoomMuted } from "@/lib/api/rooms";
import { getPost, withdrawJoin } from "@/lib/api/posts";
import { activityWhen } from "@/components/activity/ActivityParts";
import type { Post, Room, RoomMember, RoomMessage } from "@/lib/types";

type Tab = "chat" | "details" | "people";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

/** Board "Discover & join" screen 7 — the activity room (also used for need rooms until P4). */
export interface RoomSpecimen {
  room: Room;
  post: Post;
  messages: RoomMessage[];
  members: RoomMember[];
}

/** `specimen` (dev compare pages only) renders fixed data and skips every network load. */
export function RoomScreen({ roomId, specimen }: { roomId: string; specimen?: RoomSpecimen }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null | undefined>(specimen?.room);
  const [post, setPost] = useState<Post | null>(specimen?.post ?? null);
  const [messages, setMessages] = useState<RoomMessage[] | null>(specimen?.messages ?? null);
  const [members, setMembers] = useState<RoomMember[] | null>(specimen?.members ?? null);
  const [tab, setTab] = useState<Tab>("chat");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const listEnd = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (specimen) return;
    let cancelled = false;
    getMyRooms()
      .then((rooms) => {
        const found = rooms.find((r) => r.id === roomId) ?? null;
        if (cancelled) return;
        setRoom(found);
        if (!found) return;
        void markRoomRead(found.id);
        getPost(found.postId).then((p) => !cancelled && setPost(p ?? null)).catch(() => {});
      })
      .catch(() => !cancelled && setRoom(null));
    getRoomMessages(roomId).then((m) => !cancelled && setMessages(m)).catch(() => !cancelled && setMessages([]));
    getRoomMembers(roomId).then((m) => !cancelled && setMembers(m)).catch(() => !cancelled && setMembers([]));
    return () => {
      cancelled = true;
    };
  }, [roomId, specimen]);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "end" });
  }, [messages?.length, tab]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      await sendRoomMessage(roomId, text);
      setDraft("");
      setMessages(await getRoomMessages(roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That message didn't send. It's still in the box.");
    } finally {
      setSending(false);
    }
  };

  if (room === undefined) {
    return (
      <AppShell>
        <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading the room">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }
  if (room === null) {
    return (
      <AppShell>
        <div className="pt-10"><StateCard kind="empty" title="This room isn't available" detail="You may have left it, or it closed." action={<ButtonLink href="/rooms">Go to your inbox</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const title = post?.title?.trim() || room.postBody.slice(0, 80);
  const point = post?.exactMeetingPoint || post?.locationText;

  return (
    <AppShell>
      <header className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] overflow-hidden px-5 pb-5 pt-[max(12px,env(safe-area-inset-top))]">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,var(--warning),var(--primary-pressed)_45%,var(--background)_85%)] opacity-70" />
        {post?.mediaUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element -- user media
          <img src={post.mediaUrls[0]} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
        )}
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full">
              <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={room.muted ? "Unmute this room" : "Mute this room"}
              onClick={() => setRoomMuted(room.id, !room.muted).then(() => setRoom({ ...room, muted: !room.muted })).catch(() => setNotice("That didn't change. Try again."))}
              className="-mr-2 grid size-11 place-items-center rounded-full"
            >
              {room.muted ? <BellOff className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
            </button>
          </div>
          <span className="mt-3 grid size-16 place-items-center rounded-full border-2 border-foreground/80 bg-background/40">
            <Users className="size-7" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-3 font-display-serif text-[24px] font-medium leading-tight">{title}</h1>
          {post?.title && post.body && <p className="mt-1 line-clamp-2 text-[15px] text-foreground/85">{post.body}</p>}
        </div>
      </header>

      <Pills
        label="Room"
        tone="cream"
        segmented
        options={[
          { id: "chat", label: "Chat" },
          { id: "details", label: "Details" },
          { id: "people", label: `People (${room.memberCount})` },
        ]}
        value={tab}
        onChange={(t) => setTab(t as Tab)}
      />

      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            {(tab === "chat" || tab === "details") && (
              <section className="rounded-tile bg-paper p-4 text-paper-ink" aria-label="Meeting details">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Pin className="size-4" aria-hidden /> Meeting details <span className="font-normal text-paper-ink-muted">(pinned)</span></p>
                <p className="mt-2 flex items-start gap-2 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-info-on-paper" aria-hidden /> {point ?? "The host hasn't shared the meeting point yet."}</p>
                {post?.startsAt && <p className="mt-1.5 flex items-center gap-2 text-[15px]"><CalendarDays className="size-4 shrink-0" aria-hidden /> {activityWhen(post, { end: false })}</p>}
                {tab === "details" && post && (
                  <Link href={`/feed/${post.id}`} className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper underline underline-offset-4">Open the activity page</Link>
                )}
              </section>
            )}

            {tab === "chat" && (
              <>
                <ol className="mt-4 space-y-3" aria-label="Messages" aria-live="polite">
                  {!messages && <li><Skeleton className="h-16 w-3/4" /></li>}
                  {messages?.length === 0 && <li className="text-[14px] text-faint">No messages yet. Say hi to the group.</li>}
                  {messages?.map((msg) => (
                    <li key={msg.id} className={cn("flex gap-2.5", msg.fromMe && "justify-end")}>
                      {!msg.fromMe && <Avatar name={msg.senderName ?? "?"} className="size-9 text-[13px]" />}
                      <div className={cn("max-w-[78%]", msg.fromMe && "text-right")}>
                        {!msg.fromMe && <p className="text-[13px] font-semibold">{msg.senderName} <span className="font-normal text-faint">{time(msg.createdAt)}</span></p>}
                        <p className={cn("mt-1 inline-block rounded-2xl px-3.5 py-2.5 text-left text-[15px] leading-relaxed", msg.fromMe ? "bg-primary text-paper-ink" : "bg-surface text-foreground")}>{msg.content}</p>
                      </div>
                    </li>
                  ))}
                  <li ref={listEnd} aria-hidden />
                </ol>
                <form onSubmit={send} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-4 flex items-center gap-2 bg-background py-2">
                  <label htmlFor="room-message" className="sr-only">Send a message</label>
                  <input id="room-message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a message…" className="h-12 min-w-0 flex-1 rounded-full border border-field-line bg-surface px-4 text-[16px] outline-none placeholder:text-faint focus:border-primary" />
                  <m.button type="submit" whileTap={press} transition={spring.snappy} disabled={!draft.trim() || sending} aria-label="Send" className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">
                    <SendHorizontal className="size-5" aria-hidden />
                  </m.button>
                </form>
                {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
              </>
            )}

            {tab === "people" && (
              <ul className="space-y-2.5" aria-label="People in this room">
                {!members && <li><Skeleton className="h-14 w-full" /></li>}
                {members?.length === 0 && <li className="text-[14px] text-faint">Members aren&apos;t available right now.</li>}
                {members?.map((p) => (
                  <li key={p.userId} className="flex items-center gap-3 rounded-tile bg-surface p-3">
                    <Avatar name={p.name} className="size-10 text-[15px]" />
                    <span className="flex-1 text-[15px] font-medium">{p.name}</span>
                    {p.role === "admin" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[12px] font-semibold text-primary">Host</span>}
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => reportRoom(room.id, "Reported from the activity room").then(() => setNotice("Reported. Our team will review it.")).catch(() => setNotice("That report didn't send."))}
          className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-danger/60 text-[15px] font-semibold text-danger"
        >
          <Flag className="size-4" aria-hidden /> Report
        </button>
        {post && !post.mine && post.intentType === "activity" ? (
          <button
            type="button"
            onClick={() => withdrawJoin(post.id).then(() => router.push("/work")).catch((err: unknown) => setNotice(err instanceof Error ? err.message : "Couldn't leave."))}
            className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-danger/60 text-[15px] font-semibold text-danger"
          >
            <LogOut className="size-4" aria-hidden /> Leave
          </button>
        ) : (
          <span />
        )}
      </div>
      {notice && <p role="status" className="mt-3 text-center text-[14px] text-faint">{notice}</p>}
    </AppShell>
  );
}
