"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
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
import { getProjects, placeBid } from "@/lib/api/market";
import { agentRealtime } from "@/lib/realtime";
import { useAgentState, setAgentState } from "@/lib/agentState";
import { getSession, isOnboarded } from "@/lib/session";
import { getJobs, getJob } from "@/lib/api/jobs";
import { useTypewriter } from "@/hooks/use-typewriter";
import type { CandidateProfile, ChatMessage, AgentActivityEvent, IntentCard, Job, Project } from "@/lib/types";

const SUGGESTIONS = [
  "What's my best match right now?",
  "Apply me to the top match",
  "Is there a project worth bidding on?",
  "What have you done overnight?",
];

function AgentBubble({ message, onApprove, onReject }: {
  message: ChatMessage;
  onApprove: (c: IntentCard) => void;
  onReject: (c: IntentCard) => void;
}) {
  const { shown } = useTypewriter(message.content);
  return (
    <div className="flex items-start gap-2.5">
      <AgentOrbAvatar state="idle" size="sm" />
      <div className="min-w-0">
        <div className="max-w-md rounded-2xl rounded-tl-sm border border-border bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed">
          {shown}
        </div>
        {message.intentCard && (
          <IntentCardView card={message.intentCard} onApprove={onApprove} onReject={onReject} />
        )}
      </div>
    </div>
  );
}

function buildReply(
  text: string,
  profile: CandidateProfile,
  jobs: Job[],
  projects: Project[],
): { content: string; intent?: Omit<IntentCard, "id" | "status"> } {
  const t = text.toLowerCase();
  const topJob = [...jobs].sort((a, b) => b.matchPercentage - a.matchPercentage)[0];
  const topProject = projects[0];
  if (!topJob) return { content: "I don't have any open roles loaded yet — check back in a moment." };

  if (t.includes("apply") || t.includes("best match") || t.includes("top match")) {
    return {
      content: `Your strongest match right now is ${topJob.title} at ${topJob.company} — ${topJob.matchPercentage}% fit, ${topJob.location}. Want me to apply on your behalf?`,
      intent: {
        type: "apply",
        summary: `Apply to ${topJob.title} at ${topJob.company}`,
        payload: { jobId: topJob.id, title: topJob.title, company: topJob.company },
      },
    };
  }
  if ((t.includes("bid") || t.includes("project")) && topProject) {
    return {
      content: `"${topProject.title}" is open — ₹${topProject.budgetMin.toLocaleString("en-IN")}–₹${topProject.budgetMax.toLocaleString("en-IN")}, ${topProject.durationWeeks} weeks. Want me to place a competitive bid?`,
      intent: {
        type: "place_bid",
        summary: `Place a bid on "${topProject.title}"`,
        payload: { projectId: topProject.id, amount: topProject.budgetMin },
      },
    };
  }
  if (t.includes("resume")) {
    return { content: "I tailor a fresh resume for every application, highlighting whichever of your skills actually match that role. If you turn off auto-apply in Settings, I'll show you each one before it goes out." };
  }
  if (t.includes("match") || t.includes("job") || t.includes("opportun")) {
    const strong = jobs.filter((j) => j.matchPercentage >= 85).length;
    return { content: `I'm tracking ${jobs.length} open roles right now, ${strong} of them above 85% match for you. Want me to open Discover, or should I just apply to the best one?` };
  }
  if (t.includes("journal") || t.includes("overnight") || t.includes("what have you done") || t.includes("slept")) {
    return { content: "Check the Agent Journal tab above — everything I've done autonomously is logged there in order, nothing hidden or summarized away." };
  }
  return {
    content: `Based on your profile — ${profile.title}, ${profile.skills.length} skills, ${profile.experienceYears} years — I'd focus on ${topJob.title} at ${topJob.company} next, it's your strongest fit at ${topJob.matchPercentage}%.`,
  };
}

export default function AgentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [activity, setActivity] = useState<AgentActivityEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const orbState = useAgentState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}-${++idCounter.current}`;

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    Promise.all([getMyProfile(), getJobs(), getProjects()]).then(async ([p, jobList, projectList]) => {
      setProfile(p);
      setJobs(jobList);
      setProjects(projectList);
      const params = new URLSearchParams(window.location.search);
      const aboutJobId = params.get("about");
      const askQuery = params.get("ask");
      const aboutJob = aboutJobId ? await getJob(aboutJobId) : undefined;
      const welcome: ChatMessage = {
        id: "welcome",
        role: "agent",
        content: `Hi ${p.name.split(" ")[0]} — I'm your agent. Ask me anything, or approve what I find and I'll take it from there.`,
        timestamp: new Date().toISOString(),
      };
      if (aboutJob) {
        setMessages([
          welcome,
          { id: "about-user", role: "user", content: `Tell me more about ${aboutJob.title} at ${aboutJob.company}`, timestamp: new Date().toISOString() },
          {
            id: "about-agent",
            role: "agent",
            content: `${aboutJob.title} at ${aboutJob.company} is a ${aboutJob.matchPercentage}% match — ${aboutJob.location}${aboutJob.remote ? " (remote)" : ""}, ₹${aboutJob.salaryMin}–${aboutJob.salaryMax} LPA. They're looking for ${aboutJob.skills.slice(0, 3).join(", ")}. Want me to apply?`,
            timestamp: new Date().toISOString(),
            intentCard: { id: "about-intent", type: "apply", status: "pending", summary: `Apply to ${aboutJob.title} at ${aboutJob.company}`, payload: { jobId: aboutJob.id, title: aboutJob.title, company: aboutJob.company } },
          },
        ]);
      } else if (askQuery) {
        // From the ⌘K command palette's "Ask agent: ..." action — build the reply against the
        // freshly-loaded profile directly rather than reusing send(), which would read stale
        // (still-null) profile state from this same render's closure.
        const { content, intent } = buildReply(askQuery, p, jobList, projectList);
        setMessages([
          welcome,
          { id: "ask-user", role: "user", content: askQuery, timestamp: new Date().toISOString() },
          { id: "ask-agent", role: "agent", content, timestamp: new Date().toISOString(), intentCard: intent ? { ...intent, id: "ask-intent", status: "pending" } : undefined },
        ]);
      } else {
        setMessages([welcome]);
      }
    });
    getActivityFeed().then(setActivity);
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim() || !profile) return;
    const userMsg: ChatMessage = { id: nextId("u"), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAgentState("thinking");

    setTimeout(() => {
      const { content, intent } = buildReply(text, profile, jobs, projects);
      const agentMsg: ChatMessage = {
        id: nextId("a"),
        role: "agent",
        content,
        timestamp: new Date().toISOString(),
        intentCard: intent ? { ...intent, id: nextId("intent"), status: "pending" } : undefined,
      };
      setMessages((prev) => [...prev, agentMsg]);
      setAgentState(intent ? "needs-approval" : "idle");
    }, 700);
  };

  const updateIntent = (messageId: string, card: IntentCard) => {
    setMessages((prev) =>
      prev.map((m) => (m.intentCard?.id === card.id ? { ...m, intentCard: { ...card } } : m)),
    );
    void messageId;
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
    updateIntent(card.id, { ...card, status: "approved" });
    setAgentState("idle");
  };

  const handleReject = (card: IntentCard) => {
    updateIntent(card.id, { ...card, status: "rejected" });
    setAgentState("idle");
  };

  // Autonomy setting from /settings changes how approval cards behave: on autopilot, the
  // agent approves its own pending intents instead of waiting on a tap.
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
      <CandidateAppShell title="Agent">
        <OrbLoader className="h-64" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Agent" profile={profile}>
      <Tabs defaultValue="chat">
        <TabsList className="mb-4 inline-flex w-auto rounded-full bg-white/5 p-1">
          <TabsTrigger value="chat" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Chat
          </TabsTrigger>
          <TabsTrigger value="journal" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Agent Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="flex h-[min(70vh,640px)] flex-col rounded-2xl border border-border bg-white/[0.02]">
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <AgentOrbAvatar state={orbState} size="lg" />
              <div>
                <p className="text-sm font-semibold">Arena Agent</p>
                <p className="text-xs capitalize text-muted-foreground">{orbState.replace("-", " ")}</p>
              </div>
            </div>
            {/* ARENA-SHIP-IT.md #3: AI-use disclosure where the agent acts. It only ever
                rephrases facts already in your profile - never invents experience - and always
                asks before applying or bidding on your behalf, unless you've turned on
                Autopilot in Settings. */}
            <p className="border-b border-border bg-white/[0.02] px-4 py-2 text-[11px] text-muted-foreground">
              Matching and drafting here are algorithmic, not a live human — every application or bid still needs your approval below unless Autopilot is on.
            </p>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {messages.map((m) =>
                m.role === "agent" ? (
                  <AgentBubble key={m.id} message={m} onApprove={handleApprove} onReject={handleReject} />
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
                    className="rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary-soft"
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
                  className="h-11 rounded-full border-border bg-white/[0.03]"
                />
                <Button type="submit" variant="primary-gradient" size="icon" className="size-11 shrink-0 rounded-full" aria-label="Send">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="journal">
          <div className="rounded-2xl border border-border bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary-soft" /> Everything your agent has done autonomously.
            </div>
            <ActivityFeed initial={activity} />
          </div>
        </TabsContent>
      </Tabs>
    </CandidateAppShell>
  );
}
