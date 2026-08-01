import type { Bid, Project } from "@/lib/types";
import { MOCK_PROJECTS, getProjectById } from "@/lib/mock/projects";
import { delay } from "./shared";

export async function getProjects(): Promise<Project[]> {
  return delay(MOCK_PROJECTS, 300);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return delay(getProjectById(id), 250);
}

/** Mutates the in-memory MOCK_PROJECTS singleton — persists for the session (not across reloads), same as MOCK_ACTIVITY. */
export async function placeBid(projectId: string, amount: number, bidderName = "You"): Promise<Bid | null> {
  const project = getProjectById(projectId);
  if (!project) return delay(null, 200);
  const bid: Bid = {
    id: `${projectId}-bid-${Date.now()}`,
    projectId,
    bidderName,
    bidderEmoji: "🧑🏽",
    amount,
    matchPercentage: 92,
    submittedAt: new Date().toISOString(),
  };
  project.bids = [bid, ...project.bids].sort((a, b) => b.amount - a.amount);
  return delay(bid, 400);
}
