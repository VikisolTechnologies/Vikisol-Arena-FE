import type { Application, ApplicationStage } from "@/lib/types";
import { getJobById } from "@/lib/mock/jobs";
import { delay } from "./shared";

// Shared across Agent chat (apply intent), Discovery (swipe right), and the
// Applications screen — localStorage so state genuinely persists across screens today,
// swap-friendly for a real API later.
const KEY = "arena_applications";

function readAll(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
  }
}

function writeAll(apps: Application[]) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}

export async function getMyApplications(): Promise<Application[]> {
  return delay(readAll(), 250);
}

export async function hasAppliedTo(jobId: string): Promise<boolean> {
  return delay(readAll().some((a) => a.jobId === jobId), 50);
}

export async function applyToJob(jobId: string): Promise<Application> {
  const apps = readAll();
  const existing = apps.find((a) => a.jobId === jobId);
  if (existing) return delay(existing, 200);

  const job = getJobById(jobId);
  const now = new Date().toISOString();
  const app: Application = {
    id: `app-${Date.now()}-${jobId}`,
    jobId,
    stage: "applied",
    appliedAt: now,
    updatedAt: now,
  };
  writeAll([app, ...apps]);
  void job; // job existence isn't required for the mock to function
  return delay(app, 400);
}

export async function withdrawApplication(id: string): Promise<void> {
  writeAll(readAll().filter((a) => a.id !== id));
  return delay(undefined, 200);
}

export async function advanceStage(id: string, stage: ApplicationStage): Promise<Application | null> {
  const apps = readAll();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx === -1) return delay(null, 100);
  apps[idx] = { ...apps[idx], stage, updatedAt: new Date().toISOString() };
  writeAll(apps);
  return delay(apps[idx], 200);
}
