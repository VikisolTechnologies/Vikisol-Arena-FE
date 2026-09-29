import type { AgentActivityEvent, ActivityEventType } from "@/lib/types";
import { rand, pick, intBetween } from "./seed";
import { MOCK_JOBS } from "./jobs";

const TEMPLATES: Record<ActivityEventType, () => Omit<AgentActivityEvent, "id" | "timestamp">> = {
  scanned: () => ({
    type: "scanned",
    title: `Looked through ${intBetween(20, 60)} new openings near Gachibowli`,
    description: "Checked them against your skills, work and pay floor.",
  }),
  applied: () => {
    const job = pick(MOCK_JOBS.filter((j) => j.industry === "Design"));
    return {
      type: "applied",
      title: `Prepared an application: ${job.title} at ${job.company}`,
      description: "Ready for your review. Nothing is sent until you approve it.",
      relatedJobId: job.id,
      rationale: `Matched on ${job.skills.slice(0, 2).join(", ")} and your salary floor.`,
      undoable: true,
    };
  },
  match_found: () => {
    const job = pick(MOCK_JOBS.filter((j) => j.industry === "Design"));
    return {
      type: "match_found",
      title: `Found a new match: ${job.title}`,
      description: `${job.company} · ${job.location}`,
      relatedJobId: job.id,
    };
  },
  interview_proposed: () => ({
    type: "interview_proposed",
    title: "Suggested interview times",
    description: "Three times that fit your calendar — you pick one.",
  }),
  interview_confirmed: () => ({
    type: "interview_confirmed",
    title: "Interview confirmed",
    description: "Lakeshore Tech · Thursday 3:00 PM.",
  }),
  message: () => ({
    type: "message",
    title: "New message from Lakeshore Tech",
    description: "They'd like a first chat on Thursday.",
  }),
};

function buildEvent(hoursAgo: number): AgentActivityEvent {
  const type = pick(Object.keys(TEMPLATES) as ActivityEventType[]);
  const base = TEMPLATES[type]();
  return {
    id: `evt-${Math.floor(rand() * 1e6)}`,
    timestamp: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    ...base,
  };
}

export const MOCK_ACTIVITY: AgentActivityEvent[] = Array.from({ length: 14 }, (_, i) =>
  buildEvent(i * 1.7 + 0.5),
).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

/** Generates one fresh, realistic-looking event — used by the realtime emitter. */
export function generateLiveEvent(): AgentActivityEvent {
  return buildEvent(0);
}
