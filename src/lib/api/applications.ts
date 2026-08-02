import type { Application, ApplicationStage } from "@/lib/types";
import { getJobById } from "@/lib/mock/jobs";
import { CURRENT_CANDIDATE_ID } from "@/lib/mock/candidates";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";

// Shared across Agent chat (apply intent), Discovery (swipe right), and the
// Applications screen — localStorage so state genuinely persists across screens today,
// swap-friendly for a real API later.

function mine(): Application[] {
  return readApplications().filter((a) => a.candidateId === CURRENT_CANDIDATE_ID && a.jobId);
}

export async function getMyApplications(): Promise<Application[]> {
  return delay(mine(), 250);
}

/** Any application by id, regardless of whose it is — used by the interview room, which both
 * a candidate and an enterprise viewer reach for the same underlying record. */
export async function getApplicationById(id: string): Promise<Application | null> {
  return delay(readApplications().find((a) => a.id === id) ?? null, 150);
}

export async function hasAppliedTo(jobId: string): Promise<boolean> {
  return delay(mine().some((a) => a.jobId === jobId), 50);
}

export async function applyToJob(jobId: string): Promise<Application> {
  const all = readApplications();
  const existing = all.find((a) => a.candidateId === CURRENT_CANDIDATE_ID && a.jobId === jobId);
  if (existing) return delay(existing, 200);

  const job = getJobById(jobId);
  const now = new Date().toISOString();
  const app: Application = {
    id: `app-${Date.now()}-${jobId}`,
    candidateId: CURRENT_CANDIDATE_ID,
    jobId,
    stage: "applied",
    appliedAt: now,
    updatedAt: now,
  };
  writeApplications([app, ...all]);
  void job; // job existence isn't required for the mock to function
  return delay(app, 400);
}

export async function withdrawApplication(id: string): Promise<void> {
  writeApplications(readApplications().filter((a) => a.id !== id));
  return delay(undefined, 200);
}

export async function advanceStage(id: string, stage: ApplicationStage): Promise<Application | null> {
  const all = readApplications();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return delay(null, 100);
  all[idx] = { ...all[idx], stage, updatedAt: new Date().toISOString() };
  writeApplications(all);
  return delay(all[idx], 200);
}
