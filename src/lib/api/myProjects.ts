import type { Milestone, Project, ProjectRating } from "@/lib/types";
import { delay } from "./shared";
import { bumpMyCareerHealth } from "./profile";

export interface MyProject extends Project {
  mine: true;
  awardedBidId?: string;
  milestones: Milestone[];
  ratings?: ProjectRating[];
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
  return delay(readAll(), 200);
}

export async function getMyProject(id: string): Promise<MyProject | undefined> {
  return delay(readAll().find((p) => p.id === id), 150);
}

export function createMyProject(input: {
  title: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  durationWeeks: number;
  skills: string[];
}): MyProject {
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
  return project;
}

export function addBidToMyProject(projectId: string, bid: Project["bids"][number]) {
  writeAll(readAll().map((p) => (p.id === projectId ? { ...p, bids: [bid, ...p.bids].sort((a, b) => b.amount - a.amount) } : p)));
}

const MILESTONE_LABELS = ["Kickoff & plan", "Midpoint delivery", "Final delivery"];
const MILESTONE_SPLIT = [0.3, 0.4, 0.3]; // proportions of the awarded bid, one payment tranche each

export async function awardProject(projectId: string, bidId: string): Promise<MyProject | null> {
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
 * framed honestly in the UI as such rather than pretending it's a real two-party handoff. */
export async function submitMilestoneDeliverable(projectId: string, milestoneId: string, note: string): Promise<MyProject | null> {
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
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return delay(null, 100);
  const full: ProjectRating = { ...rating, submittedAt: new Date().toISOString() };
  const ratings = [...(all[idx].ratings ?? []), full];
  all[idx] = { ...all[idx], ratings };
  writeAll(all);
  return delay(all[idx], 250);
}
