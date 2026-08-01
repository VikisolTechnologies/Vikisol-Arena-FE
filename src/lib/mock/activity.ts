import type { AgentActivityEvent, ActivityEventType } from "@/lib/types";
import { rand, pick, intBetween } from "./seed";
import { MOCK_JOBS } from "./jobs";

const TEMPLATES: Record<ActivityEventType, () => Omit<AgentActivityEvent, "id" | "timestamp">> = {
  scanned: () => ({
    type: "scanned",
    title: `Scanned ${intBetween(20, 60)} new openings`,
    description: "Matched against your identity graph — skills, proof of work, salary floor.",
  }),
  applied: () => {
    const job = pick(MOCK_JOBS);
    return {
      type: "applied",
      title: `Applied to ${job.title} at ${job.company}`,
      description: `${job.matchPercentage}% match — resume tailored to this role, ready for your review.`,
      relatedJobId: job.id,
      rationale: `Matched on ${job.skills.slice(0, 2).join(", ")} and your salary floor.`,
      undoable: true,
    };
  },
  match_found: () => {
    const job = pick(MOCK_JOBS);
    return {
      type: "match_found",
      title: `Found a new match: ${job.title}`,
      description: `${job.company} · ${job.location} · ${job.matchPercentage}% match`,
      relatedJobId: job.id,
    };
  },
  interview_proposed: () => ({
    type: "interview_proposed",
    title: "Proposed interview slots",
    description: "Read both calendars and suggested 3 times that work.",
  }),
  interview_confirmed: () => ({
    type: "interview_confirmed",
    title: "Interview locked in",
    description: "Confirmed for Tuesday 3:00 PM. You just have to show up.",
  }),
  message: () => ({
    type: "message",
    title: "New message from a recruiter",
    description: "They'd love to see your portfolio.",
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
