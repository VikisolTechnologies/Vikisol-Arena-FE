import type { Application, ApplicationStage, CandidateProfile, EnterpriseProfile, JobPosting } from "@/lib/types";
import { apiFetch, ApiError } from "./httpClient";
import type { PagedResponse } from "./paged";

// ---- Enterprise profile ----

// PERF-REPORT.md Pass 4 - same fix, same reasoning as profile.ts's getMyProfile() cache: every
// enterprise shell route (11 call sites) fetches this fresh on mount, re-requesting identical
// data on each in-app navigation. Real mode only; mock mode's "fetch" is already a local read.
const ENTERPRISE_PROFILE_CACHE_TTL_MS = 15_000;
let cachedEnterpriseProfile: { value: EnterpriseProfile | null; expiresAt: number } | null = null;
let enterpriseProfileRequest: Promise<EnterpriseProfile | null> | null = null;

function setEnterpriseProfileCache(value: EnterpriseProfile | null) {
  cachedEnterpriseProfile = { value, expiresAt: Date.now() + ENTERPRISE_PROFILE_CACHE_TTL_MS };
}

/** Sign-out needs this so the next session on the same tab never reads a stale, previous
 * tenant's cached profile - same reasoning as profile.ts's clearMyProfileCache(). */
export function clearMyEnterpriseProfileCache() {
  cachedEnterpriseProfile = null;
  enterpriseProfileRequest = null;
}

export async function getMyEnterpriseProfile(): Promise<EnterpriseProfile | null> {
  if (cachedEnterpriseProfile && cachedEnterpriseProfile.expiresAt > Date.now()) return cachedEnterpriseProfile.value;
  if (enterpriseProfileRequest) return enterpriseProfileRequest;
  enterpriseProfileRequest = apiFetch<EnterpriseProfile>("/enterprise/profile/me")
    .then((profile) => {
      setEnterpriseProfileCache(profile);
      return profile;
    })
    .finally(() => {
      enterpriseProfileRequest = null;
    });
  return enterpriseProfileRequest;
}

export async function saveMyEnterpriseProfile(profile: EnterpriseProfile): Promise<EnterpriseProfile> {
  return apiFetch<EnterpriseProfile>("/enterprise/profile/me", { method: "PUT", body: profile }).then((p) => {
    setEnterpriseProfileCache(p);
    return p;
  });
}

// ---- Job postings ----

export async function getMyPostings(): Promise<JobPosting[]> {
  const page = await apiFetch<PagedResponse<JobPosting>>("/enterprise/postings", { query: { page: 0, size: 100 } });
  return page.content;
}

export async function getPosting(id: string): Promise<JobPosting | undefined> {
  return apiFetch<JobPosting>(`/enterprise/postings/${id}`).catch(() => undefined);
}

export class PostingLimitError extends Error {}

/** Enforces the plan's active-posting cap (AUDIT.md flagged this as an ungated limit) - "active"
 * means open or paused; closed postings don't count against it. Throws rather than returning
 * null so the UI can show a real upsell message instead of silently doing nothing. Real mode
 * enforces the same limit server-side (arena-api's JobPostingService); a 400 from there gets
 * re-thrown as the same PostingLimitError so the UI's catch block works in both modes. */
export async function createPosting(input: Omit<JobPosting, "id" | "status" | "createdAt"> & {
  status?: "draft" | "open";
  deadline?: string;
  experienceLevel?: string;
  questions?: { text: string; required?: boolean }[];
}): Promise<JobPosting> {
  try {
    return await apiFetch<JobPosting>("/enterprise/postings", { method: "POST", body: input });
  } catch (err) {
    if (err instanceof ApiError) throw new PostingLimitError(err.message);
    throw err;
  }
}

export async function updatePosting(id: string, patch: { title?: string; description?: string; location?: string; deadline?: string }): Promise<JobPosting> {
  return apiFetch<JobPosting>(`/enterprise/postings/${id}`, { method: "PATCH", body: patch });
}

export async function setPostingStatus(id: string, status: JobPosting["status"]): Promise<void> {
  await apiFetch<void>(`/enterprise/postings/${id}/status`, { method: "PUT", body: { status } });
  return;
}

export async function getApplicantsForPosting(postingId: string): Promise<(Application & { candidate: CandidateProfile | undefined })[]> {
  const page = await apiFetch<PagedResponse<Application & { candidate: CandidateProfile | undefined }>>(
    `/enterprise/postings/${postingId}/applicants`,
    { query: { page: 0, size: 100 } },
  );
  return page.content;
}

interface ApplicantResponseWire {
  id: string;
  jobPostingId: string;
  candidateId: string;
  stage: string;
  appliedAt: string;
}

/** Enterprise-scoped single-application lookup - fills a real gap: the enterprise interview
 * room page needs to look up one application by id, but the only single-application-by-id
 * function that existed (applications.ts's getApplicationById) calls the TALENT-only "my
 * applications" endpoint, which always 403s for a recruiter/company_admin caller. That page has
 * been silently broken in real mode since it was built - found live-testing HM3. Explicitly maps
 * jobPostingId -> postingId (the backend's ApplicantResponse field name, unlike
 * getApplicantsForPosting() above which trusts the shape matches Application 1:1 and doesn't). */
export async function getApplicant(applicationId: string): Promise<Application | null> {
  return apiFetch<ApplicantResponseWire>(`/enterprise/applicants/${applicationId}`)
    .then((res) => ({
      id: res.id, candidateId: res.candidateId, postingId: res.jobPostingId,
      stage: res.stage as ApplicationStage, appliedAt: res.appliedAt, updatedAt: res.appliedAt,
    }))
    .catch(() => null);
}

export async function moveApplicantStage(applicationId: string, stage: ApplicationStage): Promise<void> {
  await apiFetch<void>(`/enterprise/applicants/${applicationId}/stage`, { method: "PUT", body: { stage } });
  return;
}

/** No dedicated count endpoint exists server-side — fans out over (typically few) postings and
 * sums each page's totalElements rather than fetching every applicant row. Bounded by posting
 * count, not applicant count, so this stays cheap even for a busy pipeline. */
export async function getAllApplicantCounts(): Promise<number> {
  const postings = await getMyPostings();
  const counts = await Promise.all(
    postings.map((p) =>
      apiFetch<PagedResponse<unknown>>(`/enterprise/postings/${p.id}/applicants`, { query: { page: 0, size: 1 } }).then(
        (page) => page.totalElements,
      ),
    ),
  );
  return counts.reduce((sum, c) => sum + c, 0);
}

// ---- Talent Universe search ----

export async function searchTalent(query: {
  text?: string;
  industry?: string;
  remoteOnly?: boolean;
}): Promise<{ candidate: CandidateProfile | undefined; matchPercentage: number; fitBlurb: string; availability: string }[]> {
  const page = await apiFetch<
    PagedResponse<{ candidate: CandidateProfile | undefined; matchPercentage: number; fitBlurb: string; availability: string }>
  >("/enterprise/talent/search", {
    // text must always be sent as an explicit string, never omitted - arena-api has a known
    // JDBC null-parameter type-inference bug ("operator does not exist: text ~~ bytea") when
    // this query param is absent entirely.
    query: { text: query.text ?? "", industry: query.industry, remoteOnly: query.remoteOnly, page: 0, size: 50 },
  });
  return page.content;
}

/** `fullAccess` mirrors arena-api's `CandidateProfileResponse.fullAccess` - whether this
 * enterprise has already unlocked this candidate (or the candidate applied to one of their
 * postings directly). Read straight off the server response. */
export async function getCandidateDetail(id: string): Promise<(CandidateProfile & { fullAccess: boolean }) | null> {
  return apiFetch<CandidateProfile & { fullAccess: boolean }>(`/enterprise/talent/${id}`).catch(() => null);
}

/** True when this candidate directly applied to one of *my* postings — direct applicants are
 * visible for free (they reached out first), unlike a cold Talent Universe search result, which
 * still costs an unlock credit. arena-api doesn't yet expose this distinction, so this
 * conservatively treats every candidate as requiring a credit unlock, same as a cold search
 * result - see API-ISSUES.md. */
export async function hasDirectlyApplied(_candidateId: string): Promise<boolean> {
  return false;
}

/** Was fire-and-forget in real mode (`apiFetch(...).catch(() => {})`) - the caller had no way to
 * know the unlock actually succeeded, so the UI marked a candidate "unlocked" even if the credit
 * spend failed (out of credits, network error, etc.) or double-charged a credit on a double
 * click. Now genuinely awaited and errors propagate to the caller, who must confirm success
 * before updating any "unlocked" UI state. */
export async function unlockCandidate(id: string): Promise<void> {
  await apiFetch(`/enterprise/talent/${id}/unlock`, { method: "POST" });
  return;
}
