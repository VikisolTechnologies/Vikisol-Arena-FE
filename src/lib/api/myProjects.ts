import type { Milestone, Project, ProjectRating } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

export interface MyProject extends Project {
  mine: true;
  awardedBidId?: string;
  milestones: Milestone[];
  ratings?: ProjectRating[];
}

interface ProjectResponseWire extends Omit<MyProject, "status" | "mine"> {
  status: string;
  mine: boolean;
}

function toMyProject(res: ProjectResponseWire): MyProject {
  return { ...res, status: res.status.toLowerCase() as MyProject["status"], mine: true };
}

export async function getMyProjects(): Promise<MyProject[]> {
  const page = await apiFetch<PagedResponse<ProjectResponseWire>>("/marketplace/my-projects", { query: { page: 0, size: 100 } });
  return page.content.map(toMyProject);
}

export async function getMyProject(id: string): Promise<MyProject | undefined> {
  // The generic project-by-id endpoint returns every project regardless of ownership - it's
  // the same one non-owners use to view/bid on it. The server tells us who owns it via `mine`;
  // trusting that (rather than hardcoding true, which toMyProject() does) is what lets
  // ProjectDetailPage fall through to the bidder view for projects that aren't ours.
  return apiFetch<ProjectResponseWire>(`/marketplace/projects/${id}`)
    .then((res) => (res.mine ? toMyProject(res) : undefined))
    .catch(() => undefined);
}

export async function createMyProject(input: {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  durationWeeks: number;
  skills: string[];
}): Promise<MyProject> {
  return apiFetch<ProjectResponseWire>("/marketplace/projects", { method: "POST", body: input }).then(toMyProject);
}

export function addBidToMyProject(projectId: string, bid: Project["bids"][number]) {
  // real mode's award/bid data all lives server-side already
}

export async function awardProject(projectId: string, bidId: string): Promise<MyProject | null> {
  return apiFetch<ProjectResponseWire>(`/marketplace/projects/${projectId}/award`, { method: "POST", body: { bidId } }).then(toMyProject);
}

/** Records the deliverable note for a milestone. arena-api requires the deliverable to come
 * from the awarded bidder's own session (see submitMyDeliverable in market.ts, used from the
 * project detail page's winner view), so this poster-invoked path is only ever hit here if the
 * poster edits an already-submitted note. */
export async function submitMilestoneDeliverable(projectId: string, milestoneId: string, note: string): Promise<MyProject | null> {
  await apiFetch(`/marketplace/milestones/${milestoneId}/deliverables`, { method: "POST", body: { note } });
  return (await getMyProject(projectId)) ?? null;
}

/** Accepting a deliverable marks its milestone done and releases that tranche. Once every
 * milestone is accepted the project closes — completion is a real state, not a checkbox that
 * happens to be all-true. */
export async function acceptMilestone(projectId: string, milestoneId: string): Promise<MyProject | null> {
  await apiFetch(`/marketplace/milestones/${milestoneId}/accept`, { method: "PUT" });
  return (await getMyProject(projectId)) ?? null;
}

export async function submitProjectRating(
  projectId: string,
  rating: Omit<ProjectRating, "submittedAt">,
): Promise<MyProject | null> {
  // arena-api's RateRequest is {score, comment} - it derives who's rating whom from the
  // authenticated session/award record server-side, so fromRole never gets sent.
  await apiFetch(`/marketplace/projects/${projectId}/ratings`, { method: "POST", body: { score: rating.rating, comment: rating.comment } });
  return (await getMyProject(projectId)) ?? null;
}
