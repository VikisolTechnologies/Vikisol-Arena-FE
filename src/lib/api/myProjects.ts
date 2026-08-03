import type { Milestone, Project, ProjectRating } from "@/lib/types";
import { delay } from "./shared";
import { bumpMyCareerHealth } from "./profile";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

export interface MyProject extends Project {
  mine: true;
  awardedBidId?: string;
  milestones: Milestone[];
  ratings?: ProjectRating[];
}

interface ProjectResponseWire extends Omit<MyProject, "status"> {
  status: string;
}

function toMyProject(res: ProjectResponseWire): MyProject {
  return { ...res, status: res.status.toLowerCase() as MyProject["status"], mine: true };
}

const KEY = "arena_my_projects";

function readAll(): MyProject[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function writeAll(projects: MyProject[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export async function getMyProjects(): Promise<MyProject[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<ProjectResponseWire>>("/marketplace/my-projects", { query: { page: 0, size: 100 } });
    return page.content.map(toMyProject);
  }
  return delay(readAll(), 200);
}

export async function getMyProject(id: string): Promise<MyProject | undefined> {
  if (isRealMode()) {
    return apiFetch<ProjectResponseWire>(`/marketplace/projects/${id}`).then(toMyProject).catch(() => undefined);
  }
  return delay(readAll().find((p) => p.id === id), 150);
}

export async function createMyProject(input: {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  durationWeeks: number;
  skills: string[];
}): Promise<MyProject> {
  if (isRealMode()) {
    return apiFetch<ProjectResponseWire>("/marketplace/projects", { method: "POST", body: input }).then(toMyProject);
  }
  const project: MyProject = {
    id: `myproj-${Date.now()}`,
    ...input,
    postedBy: "You",
    status: "open",
    endsAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    bids: [],
    mine: true,
    milestones: [],
  };
  writeAll([project, ...readAll()]);
  return delay(project, 400);
}

export function addBidToMyProject(projectId: string, bid: Project["bids"][number]) {
  if (isRealMode()) return; // real mode's award/bid data all lives server-side already
  writeAll(readAll().map((p) => (p.id === projectId ? { ...p, bids: [bid, ...p.bids].sort((a, b) => b.amount - a.amount) } : p)));
}

const MILESTONE_LABELS = ["Kickoff & plan", "Midpoint delivery", "Final delivery"];
const MILESTONE_SPLIT = [0.3, 0.4, 0.3]; // proportions of the awarded bid, one payment tranche each

export async function awardProject(projectId: string, bidId: string): Promise<MyProject | null> {
  if (isRealMode()) {
    return apiFetch<ProjectResponseWire>(`/marketplace/projects/${projectId}/award`, { method: "POST", body: { bidId } }).then(toMyProject);
  }
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return delay(null, 100);
  const bid = all[idx].bids.find((b) => b.id === bidId);
  const total = bid?.amount ?? 0;
  all[idx] = {
    ...all[idx],
    status: "awarded",
    awardedBidId: bidId,
    milestones: MILESTONE_LABELS.map((label, i) => ({
      id: `m-${i}`,
      label,
      amount: Math.round(total * MILESTONE_SPLIT[i]),
      done: false,
    })),
  };
  writeAll(all);
  return delay(all[idx], 300);
}

/** Records the deliverable note for a milestone — in this single-user mock, the poster fills
 * this in on the bidder's behalf (there's no separate bidder session to submit it themselves),
 * framed honestly in the UI as such rather than pretending it's a real two-party handoff. Real
 * mode has the same constraint (one authenticated user acting on both sides of the demo) so
 * this call still comes from the poster's session there too. */
export async function submitMilestoneDeliverable(projectId: string, milestoneId: string, note: string): Promise<MyProject | null> {
  if (isRealMode()) {
    await apiFetch(`/marketplace/milestones/${milestoneId}/deliverables`, { method: "POST", body: { note } });
    return (await getMyProject(projectId)) ?? null;
  }
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return delay(null, 100);
  const milestones = all[idx].milestones.map((m) =>
    m.id === milestoneId ? { ...m, deliverable: { note, submittedAt: new Date().toISOString() } } : m,
  );
  all[idx] = { ...all[idx], milestones };
  writeAll(all);
  return delay(all[idx], 200);
}

/** Accepting a deliverable marks its milestone done and releases that tranche. Once every
 * milestone is accepted the project closes — completion is a real state, not a checkbox that
 * happens to be all-true. */
export async function acceptMilestone(projectId: string, milestoneId: string): Promise<MyProject | null> {
  if (isRealMode()) {
    await apiFetch(`/marketplace/milestones/${milestoneId}/accept`, { method: "PUT" });
    return (await getMyProject(projectId)) ?? null;
  }
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return delay(null, 100);
  const milestones = all[idx].milestones.map((m) => (m.id === milestoneId ? { ...m, done: true } : m));
  const allDone = milestones.length > 0 && milestones.every((m) => m.done);
  all[idx] = { ...all[idx], milestones, status: allDone ? "closed" : "awarded" };
  writeAll(all);
  if (allDone) bumpMyCareerHealth(1);
  return delay(all[idx], 250);
}

export async function submitProjectRating(
  projectId: string,
  rating: Omit<ProjectRating, "submittedAt">,
): Promise<MyProject | null> {
  if (isRealMode()) {
    await apiFetch(`/marketplace/projects/${projectId}/ratings`, { method: "POST", body: rating });
    return (await getMyProject(projectId)) ?? null;
  }
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return delay(null, 100);
  const full: ProjectRating = { ...rating, submittedAt: new Date().toISOString() };
  const ratings = [...(all[idx].ratings ?? []), full];
  all[idx] = { ...all[idx], ratings };
  writeAll(all);
  return delay(all[idx], 250);
}
