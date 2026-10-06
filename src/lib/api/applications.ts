import type { Application, ApplicationStage } from "@/lib/types";
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

export async function getMyApplications(): Promise<Application[]> {
  const page = await apiFetch<PagedResponse<ApplicationResponse>>("/applications", { query: { page: 0, size: 100 } });
  return page.content.map(toApplication);
}

/** Any application by id — used by the interview room, which both a candidate and an
 * enterprise viewer reach for the same underlying record. Real mode: the interview room only
 * ever asks for the current user's own application (candidate side), so this just filters the
 * candidate's own list; the enterprise side resolves via the enterprise-scoped applicant
 * endpoints instead (see api/enterprise.ts), never this function. */
export async function getApplicationById(id: string): Promise<Application | null> {
  const all = await getMyApplications();
  return all.find((a) => a.id === id) ?? null;
}

export async function hasAppliedTo(jobId: string): Promise<boolean> {
  return apiFetch<boolean>("/applications/exists", { query: { jobId } });
}

/** `includeCtc` (MARATHON-FE area 6): "Only me" is this account's career-profile default
 * (`CandidateProfile.consent`); this is the per-application override the architect specifically
 * asked for - share CTC with this one employer without changing the account-wide default. */
export async function applyToJob(jobId: string, opts: { includeCtc?: boolean; coverNote?: string; answers?: { questionId: string; value?: string }[] } = {}): Promise<Application> {
  const res = await apiFetch<ApplicationResponse>("/applications", { method: "POST", body: { jobId, includeCtc: opts.includeCtc, coverNote: opts.coverNote, answers: opts.answers } });
  return toApplication(res);
}

export async function withdrawApplication(id: string): Promise<void> {
  await apiFetch<void>(`/applications/${id}`, { method: "DELETE" });
  return;
}

/** MARATHON-FE area 6: only the candidate ever accepts an offer - a company proposes it
 * (`AdvanceStageRequest`, stage="offer"), the candidate's own accept is what actually moves them
 * to Hired. Mock mode had no equivalent (offers were never a distinct action there); this stays
 * real-mode only since there's nothing to fake safely here. */
export async function acceptOffer(id: string): Promise<Application | undefined> {
  const res = await apiFetch<ApplicationResponse>(`/applications/${id}/offer/accept`, { method: "POST" });
  return toApplication(res);
}

export async function declineOffer(id: string): Promise<Application | undefined> {
  const res = await apiFetch<ApplicationResponse>(`/applications/${id}/offer/decline`, { method: "POST" });
  return toApplication(res);
}

