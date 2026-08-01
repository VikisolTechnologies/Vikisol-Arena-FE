import type { Bid, Project } from "@/lib/types";
import { rand, pick, pickN, intBetween, fullName, SKILLS_BY_INDUSTRY, INDUSTRIES, AVATAR_EMOJIS } from "./seed";

const PROJECT_TITLES = [
  "Food delivery app — full product design",
  "Inventory management dashboard rebuild",
  "Clinic booking + telemedicine portal",
  "B2B sales CRM integration",
  "Warehouse route optimization tool",
  "Brand identity + marketing site",
  "Mobile app for fleet tracking",
  "Patient intake automation",
  "E-commerce checkout redesign",
  "Internal analytics dashboard",
];

function buildBid(projectId: string, isTop: boolean): Bid {
  return {
    id: `${projectId}-bid-${Math.floor(rand() * 1e6)}`,
    projectId,
    bidderName: fullName(),
    bidderEmoji: pick(AVATAR_EMOJIS),
    amount: intBetween(150000, 600000),
    matchPercentage: intBetween(80, 98),
    agentPick: isTop,
    submittedAt: new Date(Date.now() - intBetween(1, 72) * 3600 * 1000).toISOString(),
  };
}

function buildProject(id: string, title: string): Project {
  const industry = pick(INDUSTRIES);
  const bidCount = intBetween(2, 5);
  const bids = Array.from({ length: bidCount }, (_, i) => buildBid(id, i === 0));
  const budgetMin = intBetween(150000, 400000);
  return {
    id,
    title,
    description:
      "Post a project and take bids in the open. Hire on proof, not resumes — your agent shortlists the bids worth your time.",
    budgetMin,
    budgetMax: budgetMin + intBetween(100000, 300000),
    durationWeeks: intBetween(2, 12),
    skills: pickN(SKILLS_BY_INDUSTRY[industry], intBetween(3, 5)),
    postedBy: fullName(),
    status: "open",
    endsAt: new Date(Date.now() + intBetween(1, 6) * 3600 * 1000).toISOString(),
    bids: bids.sort((a, b) => b.amount - a.amount),
  };
}

export const MOCK_PROJECTS: Project[] = PROJECT_TITLES.map((title, i) =>
  buildProject(`proj-${i + 1}`, title),
);

export function getProjectById(id: string) {
  return MOCK_PROJECTS.find((p) => p.id === id);
}
