import type { Project } from "@/lib/types";
import { delay } from "./shared";

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

export interface MyProject extends Project {
  mine: true;
  awardedBidId?: string;
  milestones: Milestone[];
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

const DEFAULT_MILESTONES = ["Kickoff call scheduled", "First milestone delivered", "Final review", "Project complete"];

export function awardProject(projectId: string, bidId: string): MyProject | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  all[idx] = {
    ...all[idx],
    status: "awarded",
    awardedBidId: bidId,
    milestones: DEFAULT_MILESTONES.map((label, i) => ({ id: `m-${i}`, label, done: false })),
  };
  writeAll(all);
  return all[idx];
}

export function toggleMilestone(projectId: string, milestoneId: string): MyProject | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  const milestones = all[idx].milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
  const allDone = milestones.every((m) => m.done);
  all[idx] = { ...all[idx], milestones, status: allDone ? "closed" : "awarded" };
  writeAll(all);
  return all[idx];
}
