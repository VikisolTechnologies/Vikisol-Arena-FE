"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { m } from "motion/react";
import { ArrowLeft, Ban, Briefcase, CalendarDays, ExternalLink, Flag, Link2, MapPin, MoreVertical, SendHorizontal, VenetianMask, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { BlockSheet } from "@/components/trust/BlockSheet";
import { activityWhen } from "@/components/activity/ActivityParts";
import { closeChat, getConversations, getThreadMessages, sendThreadMessage } from "@/lib/api/messages";
import { getPost } from "@/lib/api/posts";
import { MEETING_LINK_PREFIX, latestMeetingLink } from "@/lib/data/needs";
import type { Conversation, Post, ThreadMessage } from "@/lib/types";
import { Cover } from "@/components/covers/Cover";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

export interface ConversationSpecimen {
  conversation: Conversation;
  messages: ThreadMessage[];
  post?: Post;
}

/** Board "Messages, trust…" #2 — a direct conversation, with its context and safety controls.
 *  `specimen` (dev compare pages only) renders fixed data, no network. */
export function ConversationScreen({ id, specimen }: { id: string; specimen?: ConversationSpecimen }) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null | undefined>(specimen?.conversation);
  const [messages, setMessages] = useState<ThreadMessage[] | null>(specimen?.messages ?? null);
  const [post, setPost] = useState<Post | null>(specimen?.post ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (specimen) return;
    let cancelled = false;
    getConversations()
      .then((all) => {
        const c = (Array.isArray(all) ? all : []).find((x) => x.id === id) ?? null;
        if (cancelled) return;
        setConversation(c);
        if (c?.postId) getPost(c.postId).then((p) => !cancelled && setPost(p ?? null)).catch(() => {});
      })
      .catch(() => !cancelled && setConversation(null));
    getThreadMessages(id).then((msgs) => !cancelled && setMessages(msgs)).catch(() => !cancelled && setMessages([]));
    return () => {
      cancelled = true;
    };
  }, [id, specimen]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError("");
    try {
      await sendThreadMessage(id, text);
      setDraft("");
      setMessages(await getThreadMessages(id));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That message didn't send. It's still in the box.");
    } finally {
      setSending(false);
    }
  };

  if (conversation === undefined) {
    return (
      <AppShell>
        <div className="space-y-3 pt-3" aria-busy="true" aria-label="Loading the conversation">
          <Skeleton className="h-14 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }
  if (conversation === null) {
    return (
      <AppShell>
        <div className="pt-10"><StateCard kind="empty" title="This conversation isn't available" detail="It may have been closed or removed." action={<ButtonLink href="/rooms">Go to your inbox</ButtonLink>} /></div>
      </AppShell>
    );
  }

  const anonymous = conversation.anonymous || conversation.meAnonymous;
  const name = conversation.participantName;
  const canBlock = !conversation.anonymous && !!conversation.participantId;
  const subtitle = conversation.context || (anonymous ? "Anonymous chat" : "Direct message");
  const notice2 = conversation.meAnonymous
    ? "You're anonymous here — they see an alias, not your name or profile."
    : conversation.anonymous
      ? "They're anonymous — you see an alias. Arena's safety team can still act on reports."
      : null;
  const closed = conversation.closed;

  return (
    <AppShell>
      <header className="flex items-center gap-2 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        {anonymous ? (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface"><VenetianMask className="size-5" aria-hidden /></span>
        ) : conversation.context ? (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper text-paper-ink"><Briefcase className="size-5" aria-hidden /></span>
        ) : (
          <Avatar name={name} className="size-11 shrink-0 text-[15px]" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold">{name}</h1>
          <p className="truncate text-[13px] text-faint">{subtitle}</p>
        </div>
        <button type="button" onClick={() => setMenu(true)} aria-label="More options" className="-mr-2 grid size-11 place-items-center rounded-full">
          <MoreVertical className="size-5" aria-hidden />
        </button>
      </header>

      {post && (
        <Link href={`/feed/${post.id}`} className="mt-3 flex items-start gap-3 rounded-tile bg-paper p-3 text-paper-ink">
          <Cover source={{ id: post.id, kind: post.intentType, media: post.mediaUrls[0], tags: post.tags, title: post.title, body: post.body, startsAt: post.startsAt }} className="size-20 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{post.title?.trim() || post.body.slice(0, 60)}</span>
            {post.startsAt && <span className="flex items-center gap-1.5 text-[13px] text-paper-ink-muted"><CalendarDays className="size-3.5 shrink-0" aria-hidden /> {activityWhen(post, { end: false })}</span>}
            {post.locationText && <span className="flex items-center gap-1.5 truncate text-[13px] text-paper-ink-muted"><MapPin className="size-3.5 shrink-0" aria-hidden /> {post.locationText}</span>}
            <span className="mt-2 inline-flex min-h-9 items-center rounded-full border border-paper-ink/40 px-4 text-[14px] font-semibold">View details</span>
          </span>
        </Link>
      )}

      {notice2 && <p className="mt-3 rounded-xl bg-surface px-3.5 py-2.5 text-[14px] text-foreground/90">{notice2}</p>}

      <ol className="mt-4 flex-1 space-y-3" aria-label="Messages" aria-live="polite">
        {!messages && <li><Skeleton className="h-16 w-3/4" /></li>}
        {messages?.length === 0 && <li className="text-[14px] text-faint">No messages yet. Say hi.</li>}
        {messages?.map((msg) => {
          const link = msg.content.startsWith(MEETING_LINK_PREFIX) ? latestMeetingLink([msg]) : null;
          return (
            <li key={msg.id} className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}>
              {link ? (
                <div className="w-full max-w-[85%] rounded-tile bg-paper p-4 text-paper-ink">
                  <p className="flex items-center gap-2 text-[15px] font-semibold"><Link2 className="size-4 text-info-on-paper" aria-hidden /> Meeting link</p>
                  <p className="mt-1 break-all text-[14px] text-paper-ink-muted">{link}</p>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-button border border-paper-ink/55 text-[16px] font-semibold">
                    <ExternalLink className="size-4" aria-hidden /> Open link
                  </a>
                </div>
              ) : (
                <div className={cn("max-w-[80%]", msg.fromMe && "text-right")}>
                  <p className={cn("inline-block rounded-2xl px-3.5 py-2.5 text-left text-[15px] leading-relaxed", msg.fromMe ? "rounded-br-md bg-primary text-paper-ink" : "rounded-bl-md bg-surface text-foreground")}>{msg.content}</p>
                  <p className="mt-1 text-[12px] text-faint">{time(msg.timestamp)}</p>
                </div>
              )}
            </li>
          );
        })}
        <li ref={end} aria-hidden />
      </ol>

      {closed || blocked ? (
        <p className="mt-4 rounded-tile bg-surface p-4 text-center text-[14px] text-faint">{blocked ? `You blocked ${name.split(" ")[0]}. Unblock them in Settings → Blocked accounts.` : "This chat was closed — no more messages can be sent."}</p>
      ) : (
        <>
        <div aria-hidden className="h-[calc(64px+76px+env(safe-area-inset-bottom))]" />
        <form onSubmit={send} className="sticky bottom-0 mt-4 flex items-center gap-2 bg-background py-2">
          <label htmlFor="thread-message" className="sr-only">Write a message</label>
          <input id="thread-message" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" maxLength={2000} className="h-12 min-w-0 flex-1 rounded-full border border-field-line bg-surface px-4 text-[16px] outline-none placeholder:text-faint focus:border-primary" />
          <m.button type="submit" whileTap={press} transition={spring.snappy} disabled={!draft.trim() || sending} aria-label="Send" className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40">
            <SendHorizontal className="size-5" aria-hidden />
          </m.button>
        </form>
        </>
      )}
      {error && <p role="alert" className="mt-2 text-[14px] text-danger">{error}</p>}

      <div className={cn("mt-4 grid gap-2", canBlock || (anonymous && !closed) ? "grid-cols-2" : "grid-cols-1")}>
        {canBlock && !blocked && (
          <button type="button" onClick={() => setBlockOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-field-line text-[15px] font-semibold">
            <Ban className="size-4" aria-hidden /> Block
          </button>
        )}
        {anonymous && !closed && (
          <button type="button" onClick={() => setCloseOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-field-line text-[15px] font-semibold">
            <XCircle className="size-4" aria-hidden /> Close chat
          </button>
        )}
        <button type="button" onClick={() => setReportOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-danger/60 text-[15px] font-semibold text-danger">
          <Flag className="size-4" aria-hidden /> Report
        </button>
      </div>
      {notice && <p role="status" className="mt-3 text-center text-[14px] text-faint">{notice}</p>}

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="More">
        <ul className="mt-6 space-y-1">
          {conversation.participantId && !conversation.anonymous && (
            <li><Link href={`/people/${conversation.participantId}`} className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-[16px] hover:bg-paper-muted">View profile</Link></li>
          )}
          <li><button type="button" onClick={() => { setMenu(false); setReportOpen(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-[16px] text-danger-on-paper hover:bg-paper-muted"><Flag className="size-5" aria-hidden /> Report</button></li>
        </ul>
      </BottomSheet>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} target={{ kind: "chat", id }} person={{ userId: canBlock ? conversation.participantId : undefined, name, detail: subtitle }} />
      {canBlock && <BlockSheet open={blockOpen} onClose={() => setBlockOpen(false)} person={{ userId: conversation.participantId, name }} onBlocked={() => { setBlocked(true); setNotice(""); }} />}

      <BottomSheet open={closeOpen} onClose={() => setCloseOpen(false)} title="Close this chat">
        <h2 className="mt-3 font-display-serif text-[26px] font-medium">Close this chat?</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">Neither of you can send more messages, and they can&apos;t start a new anonymous chat with you.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={() => setCloseOpen(false)}>Keep it open</Button>
          <Button
            loading={closing}
            onClick={async () => {
              setClosing(true);
              try {
                setConversation(await closeChat(conversation.id));
                setCloseOpen(false);
              } catch (err) {
                setNotice(err instanceof Error ? err.message : "Couldn't close it. Try again.");
              } finally {
                setClosing(false);
              }
            }}
          >
            Close chat
          </Button>
        </div>
      </BottomSheet>
    </AppShell>
  );
}
