import type { Bid, Project } from "@/lib/types";
import { MOCK_PROJECTS, getProjectById } from "@/lib/mock/projects";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

interface ProjectResponseWire extends Omit<Project, "status"> {
  status: string;
}

function toProject(res: ProjectResponseWire): Project {
  return { ...res, status: res.status.toLowerCase() as Project["status"] };
}

export async function getProjects(): Promise<Project[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<ProjectResponseWire>>("/marketplace/projects", { query: { page: 0, size: 100 } });
    return page.content.map(toProject);
  }
  return delay(MOCK_PROJECTS, 300);
}

export async function getProject(id: string): Promise<Project | undefined> {
  if (isRealMode()) {
    return apiFetch<ProjectResponseWire>(`/marketplace/projects/${id}`).then(toProject).catch(() => undefined);
  }
  return delay(getProjectById(id), 250);
}

/** Mock mode mutates the in-memory MOCK_PROJECTS singleton — persists for the session (not
 * across reloads), same as MOCK_ACTIVITY. Real mode posts the bid server-side; bidderName is
 * ignored there since the backend derives it from the authenticated user. */
export async function placeBid(projectId: string, amount: number, bidderName = "You"): Promise<Bid | null> {
  if (isRealMode()) {
    return apiFetch<Bid>(`/marketplace/projects/${projectId}/bids`, { method: "POST", body: { amount } });
  }
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
