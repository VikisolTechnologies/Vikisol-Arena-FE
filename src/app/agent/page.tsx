"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Send, Sparkles, WifiOff } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { AgentOrbAvatar } from "@/components/agent/AgentOrbAvatar";
import { IntentCardView } from "@/components/agent/IntentCardView";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getMyProfile } from "@/lib/api/profile";
import { getActivityFeed } from "@/lib/api/activity";
import { applyToJob } from "@/lib/api/applications";
import { placeBid } from "@/lib/api/market";
import { agentRealtime } from "@/lib/realtime";
import { getOrCreateAgentConversation, getAgentMessages, sendAgentMessage, AGENT_UNAVAILABLE_MESSAGE } from "@/lib/api/agent";
import { useAgentState, setAgentState, type AgentOrbState } from "@/lib/agentState";
import { requireOnboarded } from "@/lib/auth-guard";
import { getJob } from "@/lib/api/jobs";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { CandidateProfile, ChatMessage, AgentActivityEvent, IntentCard } from "@/lib/types";

const SUGGESTIONS = [
  "What's my best match right now?",
  "Apply me to the top match",
  "Is there a project worth bidding on?",
  "What have you done overnight?",
];

const STATUS_LABEL: Record<AgentOrbState, string> = {
  idle: "Ready",
  thinking: "Thinking…",
  acting: "Working…",
  "needs-approval": "Needs your approval",
};

function isUnavailableMessage(message: ChatMessage) {
  return message.id.startsWith("unavailable-") || message.content === AGENT_UNAVAILABLE_MESSAGE;
}

function AgentBubble({ message, showAvatar, showRetry, onApprove, onReject, onRetry }: {
  message: ChatMessage;
  showAvatar: boolean;
  showRetry: boolean;
  onApprove: (c: IntentCard) => void;
  onReject: (c: IntentCard) => void;
  onRetry: () => void;
}) {
  const { shown } = useTypewriter(message.content);
  const unavailable = isUnavailableMessage(message);

  // A "couldn't reach the agent" reply isn't really the agent talking - rendered as a compact
  // system-state row (full-width, dashed, no avatar) instead of a chat bubble so it reads as
  // connection status, not another turn of conversation. Only the most recent one offers Retry -
  // retry() always retries the latest failed input, so an older row's button would silently
  // retry the wrong text if it were ever shown active.
  if (unavailable) {
    return (
      <div>
        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-muted/60 px-3.5 py-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <WifiOff className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Agent unavailable</p>
            <p className="text-xs text-muted-foreground">Couldn&apos;t connect right now.</p>
          </div>
          {showRetry && (
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5" onClick={onRetry}>
              <RotateCw className="size-3.5" /> Retry
            </Button>
          )}
        </div>
        {message.intentCard && (
          <IntentCardView card={message.intentCard} onApprove={onApprove} onReject={onReject} />
        )}
      </div>
    );
  }

  return (
    <div className={cnGap(showAvatar)}>
      {showAvatar ? (
        <AgentOrbAvatar state="idle" size="sm" />
      ) : (
        <span className="w-7 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-md">
          {shown}
        </div>
        {message.intentCard && (
          <IntentCardView card={message.intentCard} onApprove={onApprove} onReject={onReject} />
        )}
      </div>
    </div>
  );
}

// Consecutive agent turns share one left-hand avatar slot instead of repeating it per bubble -
// a chat with several short agent messages in a row was reading as more crowded than it needed
// to (every line getting its own circle), see the mobile-UX pass this shipped with.
function cnGap(showAvatar: boolean) {
  return showAvatar ? "flex items-start gap-2.5" : "flex items-start gap-2.5 mt-1.5";
}

export default function AgentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [activity, setActivity] = useState<AgentActivityEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null);
  const orbState = useAgentState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${++idCounter.current}`;

  // Mobile keyboard-safe sizing: dvh/svh do not shrink for the on-screen keyboard on iOS
  // Safari, only window.visualViewport does (see use-keyboard-inset.ts) - so the chat panel's
  // height on mobile is measured and set in JS, not left to a CSS unit alone.
  const isMobile = useIsMobileViewport();
  const keyboardInset = useKeyboardInset();
  const reducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mobileCardHeight, setMobileCardHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isMobile) {
      // Desktop/tablet: fall back to the CSS sm:h-[min(70vh,640px)] class instead of a
      // JS-measured height - same one-time external->React sync pattern AppShell's own
      // `loggedIn` flip uses (see its comment).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMobileCardHeight(null);
      return;
    }
    const recompute = () => {
      const card = cardRef.current;
      if (!card) return;
      const top = card.getBoundingClientRect().top;
      const navReserveRaw = getComputedStyle(document.documentElement).getPropertyValue("--bottom-nav-h");
      const navReserve = parseFloat(navReserveRaw) || 96;
      setMobileCardHeight(Math.max(320, Math.round(window.innerHeight - keyboardInset - top - navReserve - 8)));
    };
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [isMobile, keyboardInset]);

  const runSend = async (convId: string, text: string, isInitial = false) => {
    const userMsg: ChatMessage = { id: nextId("u"), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => (isInitial ? [userMsg] : [...prev, userMsg]));
    setAgentState("thinking");
    setLastFailedInput(null);
    try {
      const reply = await sendAgentMessage(convId, text);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setLastFailedInput(text);
      setMessages((prev) => [...prev, {
        id: `unavailable-${nextId("x")}`,
        role: "agent",
        content: "Couldn't reach the agent — please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setAgentState("idle");
    }
  };

  // The old /agent page fabricated a whole opening exchange client-side via buildReply() - a
  // keyword matcher, not a real AI (see ARENA-DOCUMENT-3 §3/§15: "must not become a keyword
  // matcher"). It's been removed. Conversation history now lives server-side
  // (com.vikisol.arena.agent), so this loads whatever the real conversation actually contains,
  // and deep links (?about=/?ask=) send a real message through the same path a typed one would
  // take instead of inventing a canned answer.
  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    (async () => {
      const [p, conversation] = await Promise.all([getMyProfile(), getOrCreateAgentConversation()]);
      if (cancelled) return;
      setProfile(p);
      setConversationId(conversation.id);
      const history = await getAgentMessages(conversation.id);
      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);
      const aboutJobId = params.get("about");
      const askQuery = params.get("ask");

      if (history.length === 0 && aboutJobId) {
        const job = await getJob(aboutJobId);
        if (!cancelled && job) await runSend(conversation.id, `Tell me more about ${job.title} at ${job.company}`, true);
      } else if (history.length === 0 && askQuery) {
        if (!cancelled) await runSend(conversation.id, askQuery, true);
      } else {
        setMessages(history);
      }
    })();
    getActivityFeed().then(setActivity);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim() || !conversationId) return;
    setInput("");
    void runSend(conversationId, text);
  };

  const retry = () => {
    if (lastFailedInput && conversationId) void runSend(conversationId, lastFailedInput);
  };

  const updateIntent = (card: IntentCard) => {
    setMessages((prev) =>
      prev.map((m) => (m.intentCard?.id === card.id ? { ...m, intentCard: { ...card } } : m)),
    );
  };

  const handleApprove = async (card: IntentCard) => {
    setAgentState("acting");
    if (card.type === "apply") {
      await applyToJob(String(card.payload.jobId));
      agentRealtime.emit({
        id: nextId("evt"),
        type: "applied",
        title: `Applied to ${card.payload.title} at ${card.payload.company}`,
        description: "Approved from Agent chat — resume tailored to this role.",
        timestamp: new Date().toISOString(),
        relatedJobId: String(card.payload.jobId),
        undoable: true,
      });
    } else if (card.type === "place_bid") {
      await placeBid(String(card.payload.projectId), Number(card.payload.amount));
      agentRealtime.emit({
        id: nextId("evt"),
        type: "message",
        title: "Bid placed",
        description: "Approved from Agent chat.",
        timestamp: new Date().toISOString(),
      });
    }
    updateIntent({ ...card, status: "approved" });
    setAgentState("idle");
  };

  const handleReject = (card: IntentCard) => {
    updateIntent({ ...card, status: "rejected" });
    setAgentState("idle");
  };

  // Autonomy setting from /settings changes how approval cards behave: on autopilot, the
  // agent approves its own pending intents instead of waiting on a tap. Dormant today since no
  // real agent backend proposes intents yet (Noop client just reports unavailable) - stays wired
  // for when one does.
  useEffect(() => {
    if (profile?.autonomy !== "autopilot") return;
    const pending = messages.find((m) => m.intentCard?.status === "pending")?.intentCard;
    if (!pending) return;
    const id = setTimeout(() => handleApprove(pending), 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, profile?.autonomy]);

  if (!profile) {
    return (
      <AppShell title="Agent">
        <OrbLoader className="h-64" />
      </AppShell>
    );
  }

  let lastUnavailableId: string | null = null;
  for (const m of messages) if (isUnavailableMessage(m)) lastUnavailableId = m.id;

  return (
    <AppShell title="Agent" profile={profile}>
      <Tabs defaultValue="chat">
        <TabsList className="mb-2.5 inline-flex w-auto rounded-full bg-secondary p-1">
          <TabsTrigger value="chat" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Chat
          </TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Agent Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div
            ref={cardRef}
            className="flex h-[calc(100svh-13rem)] min-h-[420px] flex-col rounded-2xl border border-border bg-secondary sm:h-[min(70vh,640px)] sm:min-h-0"
            style={
              mobileCardHeight != null
                ? { height: mobileCardHeight, transition: reducedMotion ? undefined : "height 160ms ease-out" }
                : undefined
            }
          >
            {/* Compact identity/status row - the old full-size 3D orb + name/status block was
                the single largest fixed cost above the conversation on mobile. The flat avatar
                is cheap CSS (no WebGL) and takes a fraction of the height; the full 3D orb stays
                for desktop, where there's room and it's a nicer moment. */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-2.5">
              <AgentOrbAvatar state={orbState} size={isMobile ? "md" : "lg"} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Arena Agent</p>
                <p className="text-xs leading-tight text-muted-foreground">{STATUS_LABEL[orbState]}</p>
              </div>
            </div>

            {/* Honest replacement for the old disclosure line, which described buildReply()'s fake
                matching as if it were real. There is currently no live AI service behind this chat
                (see AgentServiceClient) - every reply says so rather than pretending otherwise.
                Nothing is ever applied/bid on your behalf without approval below, regardless.
                Kept as a slim single line rather than a full block - it's a disclosure, not the
                main content, and shouldn't compete with the conversation for space. */}
            <p className="shrink-0 border-b border-border px-4 py-1.5 text-[11px] leading-snug text-muted-foreground">
              This chat isn&apos;t connected to a live AI service yet — it will tell you honestly when it can&apos;t answer. Nothing is ever applied or bid on your behalf without your approval below.
            </p>

            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4"
            >
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showAvatar = !(prev && prev.role === "agent" && m.role === "agent" && !isUnavailableMessage(prev));
                return m.role === "agent" ? (
                  <AgentBubble
                    key={m.id}
                    message={m}
                    showAvatar={showAvatar}
                    showRetry={m.id === lastUnavailableId}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onRetry={retry}
                  />
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary/15 px-3.5 py-2.5 text-sm leading-relaxed text-foreground sm:max-w-md">
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {orbState === "thinking" && (
                <div className="flex items-center gap-2.5">
                  <AgentOrbAvatar state="thinking" size="sm" />
                  <p className="text-xs text-muted-foreground">Thinking…</p>
                </div>
              )}
            </div>

            <div
              className="shrink-0 border-t border-border p-3"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              {/* Suggestions are shortcuts for a fresh conversation, not a permanent fixture -
                  once real messages exist they'd only push the composer further from the thumb,
                  so they collapse away rather than staying pinned above it. A single
                  horizontally-scrollable row also avoids the 2-3 line wrap four chips used to
                  produce at real phone widths. */}
              {messages.length === 0 && (
                <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary-soft"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your agent anything…"
                  className="h-11 rounded-full border-border bg-card"
                />
                <Button type="submit" variant="default" size="icon" className="size-11 shrink-0 rounded-full" aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="journal">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary-soft" /> Everything your agent has done autonomously.
            </div>
            <ActivityFeed initial={activity} />
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
