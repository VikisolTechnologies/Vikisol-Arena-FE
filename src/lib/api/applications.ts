import type { Application, ApplicationStage } from "@/lib/types";
import { CURRENT_CANDIDATE_ID } from "@/lib/mock/candidates";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { getSession } from "@/lib/session";
import type { PagedResponse } from "./paged";

interface ApplicationResponse {
  id: string;
  jobId: string;
  stage: string;
  appliedAt: string;
  updatedAt: string;
}

function toApplication(res: ApplicationResponse): Application {
  return {
    id: res.id,
    candidateId: getSession()?.candidateId ?? "me",
    jobId: res.jobId,
    stage: res.stage.toLowerCase() as ApplicationStage,
    appliedAt: res.appliedAt,
    updatedAt: res.updatedAt,
  };
}

function mine(): Application[] {
  return readApplications().filter((a) => a.candidateId === CURRENT_CANDIDATE_ID && a.jobId);
}

export async function getMyApplications(): Promise<Application[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<ApplicationResponse>>("/applications", { query: { page: 0, size: 100 } });
    return page.content.map(toApplication);
  }
  return delay(mine(), 250);
}

/** Any application by id — used by the interview room, which both a candidate and an
 * enterprise viewer reach for the same underlying record. Real mode: the interview room only
 * ever asks for the current user's own application (candidate side), so this just filters the
 * candidate's own list; the enterprise side resolves via the enterprise-scoped applicant
 * endpoints instead (see api/enterprise.ts), never this function. */
export async function getApplicationById(id: string): Promise<Application | null> {
  if (isRealMode()) {
    const all = await getMyApplications();
    return all.find((a) => a.id === id) ?? null;
  }
  return delay(readApplications().find((a) => a.id === id) ?? null, 150);
}

export async function hasAppliedTo(jobId: string): Promise<boolean> {
  if (isRealMode()) {
    return apiFetch<boolean>("/applications/exists", { query: { jobId } });
  }
  return delay(mine().some((a) => a.jobId === jobId), 50);
}

export async function applyToJob(jobId: string): Promise<Application> {
  if (isRealMode()) {
    const res = await apiFetch<ApplicationResponse>("/applications", { method: "POST", body: { jobId } });
    return toApplication(res);
  }
  const all = readApplications();
  const existing = all.find((a) => a.candidateId === CURRENT_CANDIDATE_ID && a.jobId === jobId);
  if (existing) return delay(existing, 200);

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
  return delay(app, 400);
}

export async function withdrawApplication(id: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/applications/${id}`, { method: "DELETE" });
    return;
  }
  writeApplications(readApplications().filter((a) => a.id !== id));
  return delay(undefined, 200);
}

export async function advanceStage(id: string, stage: ApplicationStage): Promise<Application | null> {
  if (isRealMode()) {
    const res = await apiFetch<ApplicationResponse>(`/applications/${id}/stage`, { method: "PUT", body: { stage } });
    return toApplication(res);
  }
  const all = readApplications();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return delay(null, 100);
  all[idx] = { ...all[idx], stage, updatedAt: new Date().toISOString() };
  writeApplications(all);
  return delay(all[idx], 200);
}
