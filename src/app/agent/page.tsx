"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Send, Sparkles } from "lucide-react";
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
import { useAgentState, setAgentState } from "@/lib/agentState";
import { requireOnboarded } from "@/lib/auth-guard";
import { getJob } from "@/lib/api/jobs";
import { useTypewriter } from "@/hooks/use-typewriter";
import type { CandidateProfile, ChatMessage, AgentActivityEvent, IntentCard } from "@/lib/types";

const SUGGESTIONS = [
  "What's my best match right now?",
  "Apply me to the top match",
  "Is there a project worth bidding on?",
  "What have you done overnight?",
];

function AgentBubble({ message, onApprove, onReject, onRetry }: {
  message: ChatMessage;
  onApprove: (c: IntentCard) => void;
  onReject: (c: IntentCard) => void;
  onRetry: () => void;
}) {
  const { shown } = useTypewriter(message.content);
  const unavailable = message.id.startsWith("unavailable-") || message.content === AGENT_UNAVAILABLE_MESSAGE;
  return (
    <div className="flex items-start gap-2.5">
      <AgentOrbAvatar state="idle" size="sm" />
      <div className="min-w-0">
        <div className="max-w-md rounded-2xl rounded-tl-sm border border-border bg-secondary px-3.5 py-2.5 text-sm leading-relaxed">
          {shown}
        </div>
        {unavailable && (
          <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={onRetry}>
            <RotateCw className="size-3.5" /> Retry
          </Button>
        )}
        {message.intentCard && (
          <IntentCardView card={message.intentCard} onApprove={onApprove} onReject={onReject} />
        )}
      </div>
    </div>
  );
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

  return (
    <AppShell title="Agent" profile={profile}>
      <Tabs defaultValue="chat">
        <TabsList className="mb-4 inline-flex w-auto rounded-full bg-secondary p-1">
          <TabsTrigger value="chat" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Chat
          </TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Agent Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="flex h-[min(70vh,640px)] flex-col rounded-2xl border border-border bg-secondary">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <AgentOrbAvatar state={orbState} size="lg" />
              <div>
                <p className="text-sm font-semibold">Arena Agent</p>
                <p className="text-xs capitalize text-muted-foreground">{orbState.replace("-", " ")}</p>
              </div>
            </div>
            {/* Honest replacement for the old disclosure line, which described buildReply()'s fake
                matching as if it were real. There is currently no live AI service behind this chat
                (see AgentServiceClient) - every reply says so rather than pretending otherwise.
                Nothing is ever applied/bid on your behalf without approval below, regardless. */}
            <p className="border-b border-border bg-secondary px-4 py-2 text-[11px] text-muted-foreground">
              This chat isn&apos;t connected to a live AI service yet — it will tell you honestly when it can&apos;t answer. Nothing is ever applied or bid on your behalf without your approval below.
            </p>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m) =>
                m.role === "agent" ? (
                  <AgentBubble key={m.id} message={m} onApprove={handleApprove} onReject={handleReject} onRetry={retry} />
                ) : (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-md rounded-2xl rounded-tr-sm bg-primary/15 px-3.5 py-2.5 text-sm text-foreground">
                      {m.content}
                    </div>
                  </div>
                ),
              )}
              {orbState === "thinking" && (
                <div className="flex items-center gap-2.5">
                  <AgentOrbAvatar state="thinking" size="sm" />
                  <p className="text-xs text-muted-foreground">Thinking…</p>
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary-soft"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
