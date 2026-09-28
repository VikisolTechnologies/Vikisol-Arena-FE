"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Bell, BellOff, CalendarDays, CheckCircle2, ExternalLink, FileText, Flag, Link2, LogOut, MapPin, Pin, SendHorizontal, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { CompleteSheet, MeetingLinkSheet, PrivateBanner } from "@/components/needs/NeedRoomParts";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { getMyRooms, getRoomMembers, getRoomMessages, markRoomRead, sendRoomMessage, setRoomMuted } from "@/lib/api/rooms";
import { getPost, withdrawJoin } from "@/lib/api/posts";
import { activityWhen } from "@/components/activity/ActivityParts";
import { MEETING_LINK_PREFIX, latestMeetingLink, needWhen } from "@/lib/data/needs";
import { useSessionName } from "@/hooks/use-arena-session";
import type { Post, Room, RoomMember, RoomMessage } from "@/lib/types";
import { Cover } from "@/components/covers/Cover";

type Tab = "plan" | "chat" | "details" | "people";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}
const first = (name?: string) => name?.trim().split(/\s+/)[0] ?? "";

export interface RoomSpecimen {
  room: Room;
  post: Post;
  messages: RoomMessage[];
  members: RoomMember[];
  /** Open the Mark as completed sheet at this stage (compare page for board screen 6). */
  completeStage?: "ask" | "done";
}

/**
 * One room, two board configurations: the activity room ("Discover & join" #7 — Chat / Details /
 * People) and the private coordination room for a need ("Need → outcome" #5 — Plan / Chat, meeting
 * link, Mark as completed). `specimen` (dev compare pages only) renders fixed data, no network.
 */
export function RoomScreen({ roomId, specimen }: { roomId: string; specimen?: RoomSpecimen }) {
  const router = useRouter();
  const myName = useSessionName();
  const [room, setRoom] = useState<Room | null | undefined>(specimen?.room);
  const [post, setPost] = useState<Post | null>(specimen?.post ?? null);
  const [messages, setMessages] = useState<RoomMessage[] | null>(specimen?.messages ?? null);
  const [members, setMembers] = useState<RoomMember[] | null>(specimen?.members ?? null);
  const [chosenTab, setTab] = useState<Tab | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(!!specimen?.completeStage);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
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

  // Needs and offers share the private two-person coordination room.
  const kindOf = post?.intentType ?? room?.postIntentType;
  const isNeed = kindOf === "ask" || kindOf === "offer";
  const tab: Tab = chosenTab ?? (isNeed ? "plan" : "chat");

  useEffect(() => {
    listEnd.current?.scrollIntoView({ block: "end" });
  }, [messages?.length, tab]);

  const refreshMessages = () => getRoomMessages(roomId).then(setMessages).catch(() => {});

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
  // The other person: for the owner, whoever isn't the admin; for a helper, the need's author.
  const other = post?.mine ? members?.find((p) => p.role !== "admin")?.name : post?.authorName;
  const otherName = other ?? "the other person";
  const meetingLink = latestMeetingLink(messages);
  const needOpen = post?.status === "open" || post?.status === "full";

  const muteButton = (
    <button
      type="button"
      aria-label={room.muted ? "Unmute this room" : "Mute this room"}
      onClick={() => setRoomMuted(room.id, !room.muted).then(() => setRoom({ ...room, muted: !room.muted })).catch(() => setNotice("That didn't change. Try again."))}
      className="-mr-2 grid size-11 place-items-center rounded-full"
    >
      {room.muted ? <BellOff className="size-5" aria-hidden /> : <Bell className="size-5" aria-hidden />}
    </button>
  );

  const conversation = (
    <>
      <ol className="mt-4 space-y-3" aria-label="Messages" aria-live="polite">
        {!messages && <li><Skeleton className="h-16 w-3/4" /></li>}
        {messages?.length === 0 && <li className="text-[14px] text-faint">{isNeed ? `No messages yet. Say hi to ${first(otherName)}.` : "No messages yet. Say hi to the group."}</li>}
        {messages?.map((msg) => {
          const link = msg.content.startsWith(MEETING_LINK_PREFIX) ? latestMeetingLink([msg]) : null;
          return (
            <li key={msg.id} className={cn("flex gap-2.5", msg.fromMe && "justify-end")}>
              {!msg.fromMe && <Avatar name={msg.senderName ?? "?"} className="size-9 text-[13px]" />}
              <div className={cn("max-w-[78%]", msg.fromMe && "text-right")}>
                {!msg.fromMe && <p className="text-[13px] font-semibold">{msg.senderName} <span className="font-normal text-faint">{time(msg.createdAt)}</span></p>}
                <p className={cn("mt-1 inline-block rounded-2xl px-3.5 py-2.5 text-left text-[15px] leading-relaxed", msg.fromMe ? "bg-primary text-paper-ink" : "bg-surface text-foreground")}>
                  {link ? (
                    <>
                      Meeting link:{" "}
                      <a href={link} target="_blank" rel="noopener noreferrer" className="break-all font-semibold underline underline-offset-2">{link}</a>
                    </>
                  ) : (
                    msg.content
                  )}
                </p>
              </div>
            </li>
          );
        })}
        <li ref={listEnd} aria-hidden />
      </ol>
      <form onSubmit={send} className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-4 flex items-center gap-2 bg-background py-2">
        <label htmlFor="room-message" className="sr-only">Send a message</label>
        <input id="room-message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={isNeed && other ? `Message ${first(other)}…` : "Send a message…"} className="h-12 min-w-0 flex-1 rounded-full border border-field-line bg-surface px-4 text-[16px] outline-none placeholder:text-faint focus:border-primary" />
        <m.button type="submit" whileTap={press} transition={spring.snappy} disabled={!draft.trim() || sending} aria-label="Send" className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">
          <SendHorizontal className="size-5" aria-hidden />
        </m.button>
      </form>
      {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
    </>
  );

  return (
    <AppShell>
      {isNeed ? (
        <header className="pt-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full">
              <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
            </button>
            <Avatar name={otherName} className="size-10 shrink-0 text-[14px]" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold">{myName && other ? `${first(myName)} & ${first(other)}` : "Coordination room"}</h1>
              <p className="truncate text-[13px] text-faint">{title}</p>
            </div>
            {muteButton}
          </div>
          <div className="mt-3"><PrivateBanner other={first(otherName) || otherName} /></div>
        </header>
      ) : (
        <header className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] overflow-hidden px-5 pb-5 pt-[max(12px,env(safe-area-inset-top))]">
          <Cover source={{ id: post?.id ?? room.postId, kind: "activity", media: post?.mediaUrls[0], tags: post?.tags, title: post?.title ?? room.postBody, body: post?.body, startsAt: post?.startsAt }} className="absolute inset-0 opacity-70" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full">
                <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
              </button>
              {muteButton}
            </div>
            <span className="mt-3 grid size-16 place-items-center rounded-full border-2 border-foreground/80 bg-background/40">
              <Users className="size-7" strokeWidth={1.75} aria-hidden />
            </span>
            <h1 className="mt-3 font-display-serif text-[24px] font-medium leading-tight">{title}</h1>
            {post?.title && post.body && <p className="mt-1 line-clamp-2 text-[15px] text-foreground/85">{post.body}</p>}
          </div>
        </header>
      )}

      <div className={isNeed ? "mt-4" : undefined}>
        <Pills
          label="Room"
          tone={isNeed ? "orange" : "cream"}
          segmented
          options={
            isNeed
              ? [
                  { id: "plan", label: "Plan" },
                  { id: "chat", label: "Chat" },
                ]
              : [
                  { id: "chat", label: "Chat" },
                  { id: "details", label: "Details" },
                  { id: "people", label: `People (${room.memberCount})` },
                ]
          }
          value={tab}
          onChange={(t) => setTab(t as Tab)}
        />
      </div>

      <div className="mt-4 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            {tab === "plan" && (
              <section className="rounded-tile bg-paper p-4 text-paper-ink" aria-label="Pinned details">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Pin className="size-4" aria-hidden /> Pinned details</p>
                <p className="mt-2.5 flex items-start gap-2.5 text-[15px]"><CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden /> {post ? needWhen(post) : "—"}</p>
                <p className="mt-2 flex items-start gap-2.5 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-info-on-paper" aria-hidden /> {point ?? "Agree the place in the chat."}</p>
                {post?.body && <p className="mt-2 flex items-start gap-2.5 text-[15px]"><FileText className="mt-0.5 size-4 shrink-0" aria-hidden /> <span className="line-clamp-3">{post.body}</span></p>}
                {meetingLink && (
                  <p className="mt-2 flex items-start gap-2.5 text-[15px]"><Link2 className="mt-0.5 size-4 shrink-0 text-info-on-paper" aria-hidden /> <span className="min-w-0 break-all">{meetingLink}</span></p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setLinkOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-paper-ink/40 text-[15px] font-semibold">
                    <Link2 className="size-4" aria-hidden /> {meetingLink ? "Change link" : "Add meeting link"}
                  </button>
                  {meetingLink ? (
                    <a href={meetingLink} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-paper-ink/40 text-[15px] font-semibold">
                      <ExternalLink className="size-4" aria-hidden /> Open link
                    </a>
                  ) : post ? (
                    <Link href={`/feed/${post.id}`} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-paper-ink/40 text-[15px] font-semibold">
                      <FileText className="size-4" aria-hidden /> The need
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
                {post?.mine && needOpen && (
                  <Button className="mt-3" onClick={() => setCompleteOpen(true)}>
                    <CheckCircle2 className="size-5" aria-hidden /> Mark as completed
                  </Button>
                )}
                {post && !needOpen && <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-success-on-paper"><CheckCircle2 className="size-5" aria-hidden /> Completed</p>}
                {post && !post.mine && needOpen && <p className="mt-3 text-[13px] text-paper-ink-muted">{first(post.authorName)} marks it completed once it&apos;s done.</p>}
              </section>
            )}

            {tab === "details" && (
              <section className="rounded-tile bg-paper p-4 text-paper-ink" aria-label="Meeting details">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Pin className="size-4" aria-hidden /> Meeting details <span className="font-normal text-paper-ink-muted">(pinned)</span></p>
                <p className="mt-2 flex items-start gap-2 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-info-on-paper" aria-hidden /> {point ?? "The host hasn't shared the meeting point yet."}</p>
                {post?.startsAt && <p className="mt-1.5 flex items-center gap-2 text-[15px]"><CalendarDays className="size-4 shrink-0" aria-hidden /> {activityWhen(post, { end: false })}</p>}
                {post && <Link href={`/feed/${post.id}`} className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper underline underline-offset-4">Open the activity page</Link>}
              </section>
            )}

            {tab === "chat" && !isNeed && (
              <section className="rounded-tile bg-paper p-4 text-paper-ink" aria-label="Meeting details">
                <p className="flex items-center gap-2 text-[15px] font-semibold"><Pin className="size-4" aria-hidden /> Meeting details <span className="font-normal text-paper-ink-muted">(pinned)</span></p>
                <p className="mt-2 flex items-start gap-2 text-[15px]"><MapPin className="mt-0.5 size-4 shrink-0 text-info-on-paper" aria-hidden /> {point ?? "The host hasn't shared the meeting point yet."}</p>
                {post?.startsAt && <p className="mt-1.5 flex items-center gap-2 text-[15px]"><CalendarDays className="size-4 shrink-0" aria-hidden /> {activityWhen(post, { end: false })}</p>}
              </section>
            )}

            {(tab === "chat" || tab === "plan") && conversation}

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

      <div className={cn("mt-5 grid gap-2", isNeed ? "grid-cols-3" : "grid-cols-2")}>
        {isNeed && (
          <button type="button" onClick={() => setSafetyOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-field-line text-[15px] font-semibold">
            <ShieldCheck className="size-4" aria-hidden /> Safety
          </button>
        )}
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-danger/60 text-[15px] font-semibold text-danger"
        >
          <Flag className="size-4" aria-hidden /> Report
        </button>
        {post && !post.mine && (post.intentType === "activity" || isNeed) ? (
          <button
            type="button"
            onClick={() => withdrawJoin(post.id).then(() => router.push("/work")).catch((err: unknown) => setNotice(err instanceof Error ? err.message : "Couldn't leave."))}
            className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-danger/60 text-[15px] font-semibold text-danger"
          >
            <LogOut className="size-4" aria-hidden /> {isNeed ? "End chat" : "Leave"}
          </button>
        ) : (
          <span />
        )}
      </div>
      {notice && <p role="status" className="mt-3 text-center text-[14px] text-faint">{notice}</p>}

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        target={{ kind: "room", id: room.id }}
        person={isNeed && other ? { userId: (post?.mine ? members?.find((p) => p.role !== "admin")?.userId : post?.authorUserId) || undefined, name: other, detail: title } : undefined}
      />

      {isNeed && post && (
        <>
          <MeetingLinkSheet open={linkOpen} roomId={room.id} onClose={() => setLinkOpen(false)} onSent={refreshMessages} />
          <CompleteSheet
            open={completeOpen}
            onClose={() => {
              setCompleteOpen(false);
              void refreshMessages();
            }}
            postId={post.id}
            roomId={room.id}
            title={title}
            other={otherName}
            onCompleted={() => setPost({ ...post, status: "closed" })}
            initialStage={specimen?.completeStage}
            noun={kindOf === "offer" ? "offer" : "need"}
          />
          <BottomSheet open={safetyOpen} onClose={() => setSafetyOpen(false)} title="Safety">
            <h2 className="mt-3 font-display-serif text-[24px] font-medium">Meeting safely</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed">
              <li>Meet in a public or shared space where you can.</li>
              <li>Tell someone you trust where you&apos;re going.</li>
              <li>Keep the conversation here until you&apos;re comfortable.</li>
              <li>Never share OTPs, bank details or passwords.</li>
            </ul>
            <p className="mt-4 text-[14px] text-paper-ink-muted">Something feels wrong? Use Report — our team reviews every report.</p>
          </BottomSheet>
        </>
      )}
    </AppShell>
  );
}
