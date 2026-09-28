"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowUp, BarChart3, Heart, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, rise, spring } from "@/lib/motion";
import { Screen, TopBar } from "@/components/bplus/Screen";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, PreviewPill, StateCard } from "@/components/bplus/Primitives";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { JennyActionCard } from "@/components/jenny/JennyActionCard";
import { useGuest } from "@/hooks/use-arena-session";
import { FIXTURES_ALLOWED } from "@/lib/data/mode";
import { PREVIEW_JENNY_IDEAS, PREVIEW_JENNY_SUGGESTION } from "@/lib/data/fixtures";
import { AGENT_UNAVAILABLE_MESSAGE, getAgentMessages, getOrCreateAgentConversation, sendAgentMessage } from "@/lib/api/agent";
import type { AgentAction, ChatMessage } from "@/lib/types";

const TABS = [
  { id: "for-you", label: "For you" },
  { id: "explore", label: "Explore" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Status = "unknown" | "online" | "offline";

const WHY_ICON = { interest: Heart, distance: MapPin, people: Users, trend: BarChart3 } as const;

function statusFrom(messages: ChatMessage[]): Status {
  const last = [...messages].reverse().find((msg) => msg.role === "agent");
  if (!last) return "unknown";
  return last.serviceUnavailable || last.content === AGENT_UNAVAILABLE_MESSAGE ? "offline" : "online";
}

/** Jenny home (B+ board "7. Jenny"). Status is only ever what the last real reply showed. */
export function JennyScreen() {
  const router = useRouter();
  const guest = useGuest();
  const [tab, setTab] = useState<Tab>("for-you");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("unknown");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (guest !== false) return;
    let cancelled = false;
    getOrCreateAgentConversation()
      .then(async (c) => {
        const history = await getAgentMessages(c.id);
        if (cancelled) return;
        setConversationId(c.id);
        setMessages(history);
        setStatus(statusFrom(history));
      })
      .catch(() => !cancelled && setStatus("offline"));
    return () => {
      cancelled = true;
    };
  }, [guest]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId) return;
    setSending(true);
    setError("");
    setTab("history");
    const mine: ChatMessage = { id: `me-${Date.now()}`, role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((cur) => [...cur, mine]);
    setDraft("");
    try {
      const reply = await sendAgentMessage(conversationId, text);
      setMessages((cur) => [...cur, reply]);
      setStatus(statusFrom([reply]));
    } catch (err) {
      setStatus("offline");
      setError(err instanceof Error && err.message ? err.message : "Jenny didn't answer. Your message wasn't lost — try again.");
    } finally {
      setSending(false);
    }
  };

  const online = status === "online";
  // Real proposals (newest first). They replace the preview card: a real one is never mixed up
  // with preview data.
  const actions = messages.flatMap((msg) => msg.actions ?? []).reverse();
  const onActionChange = (next: AgentAction) =>
    setMessages((cur) => cur.map((msg) => (msg.actions?.some((a) => a.id === next.id) ? { ...msg, actions: msg.actions.map((a) => (a.id === next.id ? next : a)) } : msg)));

  return (
    <Screen className="pb-0">
      <TopBar onBack={() => router.back()} center={<h1 className="font-display-serif text-[28px] font-medium">Jenny</h1>} />
      <div className="-mt-1 flex justify-center">
        {status !== "unknown" && (
          <span role="status" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold", online ? "bg-success/15 text-success" : "bg-foreground/10 text-faint")}>
            <span className={cn("size-2 rounded-full", online ? "bg-success" : "bg-faint")} aria-hidden />
            {online ? "Online" : "Offline"}
          </span>
        )}
      </div>

      <div className="mt-4">
        <Pills label="Jenny" options={TABS} value={tab} onChange={setTab} tone="cream" />
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            {tab === "for-you" && (
              <div className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <JennyOrb size={148} online={online} />
                  <p className="mt-6 font-display-serif text-[23px] leading-snug">
                    A small nudge
                    <br />
                    for a brighter neighborhood.
                  </p>
                  {!online && status !== "unknown" && <p className="mt-2 text-[14px] text-faint">Jenny is offline right now. Arena works normally without her.</p>}
                </div>
                {actions.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {actions.map((action) => <JennyActionCard key={action.id} action={action} onChange={onActionChange} />)}
                  </div>
                )}
                {actions.length === 0 && FIXTURES_ALLOWED && dismissed !== PREVIEW_JENNY_SUGGESTION.headline && (
                  <m.article initial="hidden" animate="shown" variants={rise} className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5">
                    <div className="flex justify-end"><PreviewPill /></div>
                    <h2 className="mt-1 font-display-serif text-[21px] leading-snug">{PREVIEW_JENNY_SUGGESTION.headline}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{PREVIEW_JENNY_SUGGESTION.detail}</p>
                    <p className="mt-4 text-[14px] font-semibold">Why this?</p>
                    <ul className="mt-2 space-y-2">
                      {PREVIEW_JENNY_SUGGESTION.why.map((w) => {
                        const IconCmp = WHY_ICON[w.icon];
                        return (
                          <li key={w.text} className="flex items-center gap-3 text-[14px] text-foreground/90">
                            <IconCmp className="size-4 text-primary" strokeWidth={2} aria-hidden />
                            {w.text}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Button onClick={() => setDismissed(PREVIEW_JENNY_SUGGESTION.headline)} className="h-12">Approve</Button>
                      <Button variant="outline" onClick={() => setDismissed(PREVIEW_JENNY_SUGGESTION.headline)} className="h-12">Not now</Button>
                    </div>
                    <p className="mt-3 text-center text-[12px] text-faint">{PREVIEW_JENNY_SUGGESTION.source} Preview only — nothing is sent or joined.</p>
                  </m.article>
                )}
              </div>
            )}

            {tab === "explore" && (
              <div className="pt-6">
                {FIXTURES_ALLOWED ? (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-[19px] font-semibold">Ideas to try</h2>
                      <PreviewPill />
                    </div>
                    <ul className="space-y-2.5">
                      {PREVIEW_JENNY_IDEAS.map((idea, i) => (
                        <m.li key={idea.title} initial="hidden" animate="shown" variants={rise} custom={i}>
                          <m.button
                            type="button"
                            whileTap={press}
                            transition={spring.snappy}
                            onClick={() => setDraft(idea.title)}
                            className="w-full rounded-tile bg-paper p-4 text-left text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <span className="block text-[16px] font-semibold">{idea.title}</span>
                            <span className="block text-[13px] text-paper-ink-muted">{idea.detail}</span>
                          </m.button>
                        </m.li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <StateCard kind="empty" title="Nothing to explore yet" detail="Ideas appear here once Jenny can suggest from real activity nearby." />
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="pt-6">
                {messages.length === 0 ? (
                  <StateCard kind="empty" title="No conversation yet" detail="Ask Jenny something below. She drafts and explains; you approve anything that gets shared." />
                ) : (
                  <ol className="space-y-3" aria-live="polite">
                    {messages.map((msg) => (
                      <li key={msg.id} className={cn("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}>
                        <p className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed", msg.role === "user" ? "bg-primary text-white" : "bg-surface text-foreground")}>{msg.content}</p>
                        {msg.actions?.map((action) => (
                          <div key={action.id} className="w-full">
                            <JennyActionCard action={action} onChange={onActionChange} />
                          </div>
                        ))}
                      </li>
                    ))}
                    {sending && <li className="text-[14px] text-faint">Jenny is thinking…</li>}
                  </ol>
                )}
                {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-background/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {guest ? (
          <ButtonLink href="/auth?mode=signin" variant="outline">Sign in to talk to Jenny</ButtonLink>
        ) : (
          <form onSubmit={send} className="flex items-center gap-2">
            <JennyOrb size={28} online={online} />
            <label className="sr-only" htmlFor="jenny-input">Ask Jenny</label>
            <input
              id="jenny-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask me anything…"
              className="h-12 min-w-0 flex-1 rounded-full border border-field-line bg-surface px-4 text-[16px] outline-none placeholder:text-faint focus:border-primary"
            />
            <m.button
              type="submit"
              whileTap={press}
              transition={spring.snappy}
              disabled={!draft.trim() || sending || !conversationId}
              aria-label="Send"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white outline-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowUp className="size-5" strokeWidth={2.4} aria-hidden />
            </m.button>
          </form>
        )}
        <p className="mt-2 text-center text-[12px] text-faint">
          Jenny drafts and explains. Nothing is posted or sent without your approval.{" "}
          <Link href="/settings" className="underline underline-offset-2">Permissions</Link>
        </p>
      </div>
    </Screen>
  );
}
