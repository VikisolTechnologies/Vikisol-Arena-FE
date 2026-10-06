"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowUp, Bell, BriefcaseBusiness, CalendarDays, ChevronRight, FilePen, Info, Lock, Share2, ShieldCheck, UserRoundPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, press, rise, spring } from "@/lib/motion";
import { Screen } from "@/components/bplus/Screen";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Pills, PreviewPill, StateCard } from "@/components/bplus/Primitives";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { JennyActionCard } from "@/components/jenny/JennyActionCard";
import { MicButton } from "@/components/jenny/JennyParts";
import { useAutomations, useJennyQueue, useJobSearch } from "@/components/jenny/useJenny";
import { useGuest, useSessionName } from "@/hooks/use-arena-session";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { getFeedItems, originFor, type FeedItem } from "@/lib/data/feed";
import { AUTOMATION_ROWS, JENNY_PREVIEW, RECENT_FIXTURES, REMINDER_FIXTURES, ago, readDecisions, todaysPlan, writeAutomations, type AutomationId } from "@/lib/data/jenny";
import { AGENT_UNAVAILABLE_MESSAGE, getAgentMessages, getOrCreateAgentConversation, sendAgentMessage } from "@/lib/api/agent";
import type { AgentAction, ChatMessage } from "@/lib/types";

const TABS = [
  { id: "today", label: "Today" },
  { id: "automations", label: "Automations" },
  { id: "reminders", label: "Reminders" },
  { id: "history", label: "History" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type Status = "unknown" | "online" | "offline";

const AUTO_ICON: Record<AutomationId, typeof Bell> = { calendar: CalendarDays, invite: UserRoundPlus, groups: Share2 };
const RECENT_ICON = { post: FilePen, calendar: CalendarDays, invite: UserRoundPlus } as const;

/** What automations never do, whatever is switched on (blueprint §3). */
const NEVER = ["Apply for a job", "Publish a post", "Send a message", "Invite people", "Change who can see your profile", "Share your exact location"];

function statusFrom(messages: ChatMessage[]): Status {
  const last = [...messages].reverse().find((msg) => msg.role === "agent");
  if (!last) return "unknown";
  return last.serviceUnavailable || last.content === AGENT_UNAVAILABLE_MESSAGE ? "offline" : "online";
}

/** Jenny (B+ core #7 + VNext AI-layer board #7): today's plan, automations you control, reminders
 *  and the real conversation. Status is only ever what the last real reply showed. */
export function JennyScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const guest = useGuest();
  const name = useSessionName();
  const [tab, setTab] = useState<Tab>(() => (TABS.some((t) => t.id === params.get("tab")) ? (params.get("tab") as Tab) : "today"));
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>("unknown");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

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
  // Real proposals (newest first) always come before anything from the preview world.
  const actions = messages.flatMap((msg) => msg.actions ?? []).reverse();
  const onActionChange = (next: AgentAction) =>
    setMessages((cur) => cur.map((msg) => (msg.actions?.some((a) => a.id === next.id) ? { ...msg, actions: msg.actions.map((a) => (a.id === next.id ? next : a)) } : msg)));

  return (
    <Screen className="pb-0">
      <header className="flex items-center gap-1 pt-2">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="font-display-serif text-[30px] font-medium">Jenny</h1>
        <div className="flex flex-1 justify-center">
          {status !== "unknown" && (
            <span role="status" className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold", online ? "text-success" : "bg-foreground/10 text-faint")}>
              <span className={cn("size-2.5 rounded-full", online ? "bg-success" : "bg-faint")} aria-hidden />
              {online ? "Online" : "Offline"}
            </span>
          )}
        </div>
        <button type="button" onClick={() => setInfoOpen(true)} aria-label="About Jenny" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-foreground/5">
          <Info className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="mt-3">
        <Pills label="Jenny" options={TABS} value={tab} onChange={setTab} compact />
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="pt-5">
            {tab === "today" && (
              <div className="space-y-4">
                {actions.map((action) => <JennyActionCard key={action.id} action={action} onChange={onActionChange} />)}
                {JENNY_PREVIEW && guest === false ? (
                  <Today name={name} goto={setTab} />
                ) : (
                  <div className="flex flex-col items-center pt-4 text-center">
                    <JennyOrb size={148} online={online} />
                    <p className="mt-6 font-display-serif text-[23px] leading-snug">
                      A small nudge
                      <br />
                      for a brighter neighborhood.
                    </p>
                    {!online && status !== "unknown" && <p className="mt-2 text-[14px] text-faint">Jenny is offline right now. Arena works normally without her.</p>}
                    {actions.length === 0 && <p className="mt-4 max-w-[32ch] text-[14px] text-faint">Ask her something below. Your plan, automations and reminders appear here as she learns what you&apos;re up to.</p>}
                  </div>
                )}
              </div>
            )}
            {tab === "automations" && (JENNY_PREVIEW ? <Automations /> : <StateCard kind="empty" title="No automations yet" detail="When Jenny can watch for things on your behalf, you'll switch each one on here. She'll always ask before anything goes out." />)}
            {tab === "reminders" && (JENNY_PREVIEW ? <Reminders /> : <StateCard kind="empty" title="No reminders" detail="Ask Jenny to remind you about something and it shows up here." />)}
            {tab === "history" && (
              <div>
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
                {JENNY_PREVIEW && guest === false && <RecentActivity className="mt-6" />}
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
            <div className="flex h-12 min-w-0 flex-1 items-center rounded-full border border-field-line bg-surface pl-4 pr-0.5 focus-within:border-primary">
              <label className="sr-only" htmlFor="jenny-input">Ask Jenny</label>
              <input id="jenny-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask Jenny anything…" className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-faint" />
              <MicButton onText={(t) => setDraft((cur) => (cur ? `${cur} ${t}` : t))} />
            </div>
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
        <p className="mt-2 text-center text-[12px] text-faint">Jenny drafts and explains. Nothing is posted or sent without your approval.</p>
      </div>

      <BottomSheet open={infoOpen} onClose={() => setInfoOpen(false)} title="About Jenny">
        <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">Jenny prepares. You decide.</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">She drafts posts and messages, explains why something might suit you, and keeps track of what&apos;s waiting. Anything that leaves your account needs your tap.</p>
        <p className="mt-4 text-[15px] font-semibold">She never, on her own:</p>
        <ul className="mt-1 space-y-1 pl-5 text-[15px]">
          {NEVER.map((n) => <li key={n} className="list-disc">{n}</li>)}
        </ul>
        <p className="mt-4 text-[14px] text-paper-ink-muted">&ldquo;Online&rdquo; appears only after she has actually answered. If she can&apos;t be reached she says Offline, and Arena keeps working without her.</p>
        <ButtonLink href="/settings?sheet=jenny" className="mt-5" onClick={() => setInfoOpen(false)}>Jenny&apos;s permissions</ButtonLink>
      </BottomSheet>
    </Screen>
  );
}

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <m.section variants={rise} initial="hidden" animate="shown" data-surface="paper" aria-label={title} className={cn("rounded-[var(--radius-card)] bg-paper p-4 text-paper-ink", className)}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </m.section>
  );
}

const linkCls = "inline-flex min-h-11 items-center text-[15px] font-semibold text-primary-on-paper";

function Today({ name, goto }: { name: string; goto: (t: Tab) => void }) {
  const queue = useJennyQueue();
  const auto = useAutomations();
  const entry = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  useEffect(() => {
    getFeedItems("for-you", 0, 40).then((x) => setItems(Array.isArray(x) ? x : [])).catch(() => setItems([]));
  }, []);
  const origin = useMemo(() => originFor(null, entry.area), [entry.area]);
  const plan = useMemo(() => (items && queue ? todaysPlan(items, queue, origin) : null), [items, queue, origin]);
  const first = (name || "there").split(" ")[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3.5">
        <JennyOrb size={56} online={false} still />
        <div>
          <p className="text-[20px] font-semibold">Hi {first}!</p>
          <p className="text-[15px] text-faint">Here&apos;s your plan for today.</p>
        </div>
        <PreviewPill className="ml-auto" />
      </div>

      <Card title="Today's plan" action={<Link href="/work?tab=approval" className={linkCls}>See all</Link>}>
        {!plan ? (
          <div className="h-24 animate-pulse rounded-xl bg-paper-muted motion-reduce:animate-none" aria-busy="true" aria-label="Loading your plan" />
        ) : plan.length === 0 ? (
          <p className="text-[15px] text-paper-ink-muted">Nothing planned yet — a quiet day.</p>
        ) : (
          <ol className="relative ml-1 border-l-2 border-paper-ink/15">
            {plan.map((row, i) => (
              <li key={`${row.title}-${i}`} className={cn(i > 0 && "border-t border-paper-ink/10")}>
                <Link href={row.href ?? "/work"} className="relative grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-2.5 pl-3 outline-none focus-visible:outline-2 focus-visible:outline-primary">
                  {row.urgent && <span aria-hidden className="absolute -left-[5px] top-4 size-2 rounded-full bg-primary" />}
                  <span className="text-[14px] font-medium">{row.time}</span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-snug">{row.title}</span>
                    <span className={cn("block text-[14px]", row.urgent ? "font-medium text-primary-on-paper" : "text-paper-ink-muted")}>{row.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="Automations you control" action={<button type="button" onClick={() => goto("automations")} className={linkCls}>Manage</button>}>
        <AutomationRows values={auto} />
      </Card>

      <RecentActivity onSeeAll={() => goto("history")} />

      <Card title="Permissions & data" action={<Link href="/settings?sheet=jenny" className={linkCls}>Review</Link>}>
        <Link href="/settings?sheet=jenny" className="flex min-h-11 items-center gap-3 text-[15px]">
          <ShieldCheck className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
          <span className="flex-1">You control what Jenny can use</span>
          <ChevronRight className="size-5 text-paper-ink-muted" aria-hidden />
        </Link>
      </Card>
    </div>
  );
}

function AutomationRows({ values }: { values: Record<AutomationId, boolean> | null }) {
  if (!values) return <div className="h-40 animate-pulse rounded-xl bg-paper-muted motion-reduce:animate-none" aria-hidden />;
  return (
    <ul className="divide-y divide-paper-ink/10">
      {AUTOMATION_ROWS.map((a) => {
        const Icon = AUTO_ICON[a.id];
        return (
          <li key={a.id} className="flex items-center gap-3">
            <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden />
            <div className="min-w-0 flex-1">
              <PaperSwitch compact label={a.title} detail={a.detail} checked={values[a.id]} onChange={(v) => writeAutomations({ ...values, [a.id]: v })} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RecentActivity({ onSeeAll, className }: { onSeeAll?: () => void; className?: string }) {
  const [decisions] = useState(() => readDecisions());
  const rows = [
    ...Object.entries(decisions).filter(([, d]) => d.state === "approved").map(([id, d]) => ({ key: id, icon: FilePen, text: `You approved: ${d.note}`, at: d.at })),
    ...RECENT_FIXTURES.map((r) => ({ key: r.text, icon: RECENT_ICON[r.icon], text: r.text, at: r.at })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return (
    <Card title="Recent activity" className={className} action={onSeeAll ? <button type="button" onClick={onSeeAll} className={linkCls}>See all</button> : <PreviewPill />}>
      <ul className="space-y-1">
        {rows.slice(0, onSeeAll ? 3 : 10).map((r) => (
          <li key={r.key} className="flex min-h-9 items-center gap-3 text-[15px]">
            <r.icon className="size-4 shrink-0 text-paper-ink-muted" strokeWidth={1.9} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{r.text}</span>
            <span className="shrink-0 text-[13px] text-paper-ink-muted">{ago(r.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Automations() {
  const auto = useAutomations();
  const job = useJobSearch();
  return (
    <div className="space-y-4">
      <Card title="My job search" action={<PreviewPill />}>
        <div className="flex items-start gap-3">
          <BriefcaseBusiness className="mt-0.5 size-5 shrink-0" strokeWidth={1.9} aria-hidden />
          <p className="flex-1 text-[15px]">
            {job?.on ? "On — Jenny watches for verified roles and prepares drafts. She never submits without your approval." : "Tell Jenny what you're looking for. She finds roles, explains each one and prepares drafts — you approve every application."}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {job?.on ? (
            <>
              <ButtonLink href="/identity/career/shortlist" className="h-11 text-[16px]">Shortlist</ButtonLink>
              <ButtonLink href="/identity/career/automation" variant="outline" className="h-11 border-paper-ink/55 text-[16px] text-paper-ink">Edit</ButtonLink>
            </>
          ) : (
            <ButtonLink href="/identity/career/jenny" className="col-span-2 h-11 text-[16px]">Set it up</ButtonLink>
          )}
        </div>
      </Card>
      <Card title="Around you">
        <AutomationRows values={auto} />
      </Card>
      <Card title="Whatever is switched on, Jenny never">
        <ul className="grid grid-cols-1 gap-1.5 text-[15px]">
          {NEVER.map((n) => (
            <li key={n} className="flex items-center gap-2.5">
              <Lock className="size-4 shrink-0 text-paper-ink-muted" strokeWidth={2} aria-hidden /> {n.toLowerCase()}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-paper-ink-muted">These always come to you first, in &ldquo;Needs your approval&rdquo; on Work.</p>
      </Card>
    </div>
  );
}

function Reminders() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">Coming up</h2>
        <PreviewPill />
      </div>
      <ul className="space-y-2.5">
        {REMINDER_FIXTURES.map((r, i) => (
          <m.li key={r.id} variants={rise} custom={i} initial="hidden" animate="shown" data-surface="paper" className="flex items-start gap-3 rounded-tile bg-paper p-3.5 text-paper-ink">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary-on-paper">
              <Bell className="size-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{r.title}</span>
              <span className="block text-[14px] text-paper-ink-muted">{r.detail}</span>
              <span className="mt-0.5 block text-[13px] font-medium">{r.when}</span>
            </span>
          </m.li>
        ))}
      </ul>
      <p className="pt-1 text-[13px] text-faint">Reminders only remind you — nothing is sent to anyone.</p>
      <Button variant="outline" className="mt-2" onClick={() => document.getElementById("jenny-input")?.focus()}>Ask Jenny to remind you</Button>
    </div>
  );
}
