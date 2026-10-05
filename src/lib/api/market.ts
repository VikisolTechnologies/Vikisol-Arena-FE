import type { Bid, Project } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

interface ProjectResponseWire extends Omit<Project, "status"> {
  status: string;
}

function toProject(res: ProjectResponseWire): Project {
  return { ...res, status: res.status.toLowerCase() as Project["status"] };
}

export async function getProjects(): Promise<Project[]> {
  const page = await apiFetch<PagedResponse<ProjectResponseWire>>("/marketplace/projects", { query: { page: 0, size: 100 } });
  return page.content.map(toProject);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return apiFetch<ProjectResponseWire>(`/marketplace/projects/${id}`).then(toProject).catch(() => undefined);
}

/** Posts the bid server-side; bidderName is ignored there since the backend derives it from
 * the authenticated user. */
export async function placeBid(projectId: string, amount: number, bidderName = "You"): Promise<Bid | null> {
  return apiFetch<Bid>(`/marketplace/projects/${projectId}/bids`, { method: "POST", body: { amount } });
}

/** Lets the winning bidder submit their own milestone deliverable, since arena-api requires
 * the deliverable to come from the awarded bidder's own session (the poster can't submit on
 * their behalf there). */
export async function submitMyDeliverable(milestoneId: string, note: string): Promise<void> {
  await apiFetch(`/marketplace/milestones/${milestoneId}/deliverables`, { method: "POST", body: { note } });
}
