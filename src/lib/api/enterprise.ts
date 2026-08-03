import type { Application, ApplicationStage, CandidateProfile, EnterpriseProfile, JobPosting } from "@/lib/types";
import { getEnterpriseProfile, saveEnterpriseProfile } from "@/lib/session";
import { MOCK_CANDIDATES, getCandidateById } from "@/lib/mock/candidates";
import { pick, pickN } from "@/lib/mock/seed";
import { POSTING_LIMITS } from "@/lib/plan";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch, ApiError } from "./httpClient";
import type { PagedResponse } from "./paged";

// ---- Enterprise profile ----

export async function getMyEnterpriseProfile(): Promise<EnterpriseProfile | null> {
  if (isRealMode()) return apiFetch<EnterpriseProfile>("/enterprise/profile/me");
  return delay(getEnterpriseProfile(), 200);
}

export async function saveMyEnterpriseProfile(profile: EnterpriseProfile): Promise<EnterpriseProfile> {
  if (isRealMode()) return apiFetch<EnterpriseProfile>("/enterprise/profile/me", { method: "PUT", body: profile });
  saveEnterpriseProfile(profile);
  return delay(profile, 300);
}

// ---- Job postings ----

const POSTINGS_KEY = "arena_enterprise_postings";

function readPostings(): JobPosting[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(POSTINGS_KEY) || "[]");
  } catch {
    return [];
  }
}
function writePostings(postings: JobPosting[]) {
  localStorage.setItem(POSTINGS_KEY, JSON.stringify(postings));
}

export async function getMyPostings(): Promise<JobPosting[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<JobPosting>>("/enterprise/postings", { query: { page: 0, size: 100 } });
    return page.content;
  }
  return delay(readPostings(), 250);
}

export async function getPosting(id: string): Promise<JobPosting | undefined> {
  if (isRealMode()) return apiFetch<JobPosting>(`/enterprise/postings/${id}`).catch(() => undefined);
  return delay(readPostings().find((p) => p.id === id), 150);
}

/** Seeds 3-6 realistic applicants from the candidate pool so a fresh posting isn't empty —
 * written into the same unified applications store the candidate side reads, just with
 * postingId set instead of jobId. Mock-only: arena-api seeds its own demo data server-side. */
function seedApplicants(postingId: string, industry: JobPosting["industry"]) {
  const pool = MOCK_CANDIDATES.filter((c) => c.industry === industry);
  const chosen = pickN(pool.length >= 3 ? pool : MOCK_CANDIDATES, Math.min(6, Math.max(3, pool.length)));
  const stages: ApplicationStage[] = ["applied", "applied", "screening", "screening", "interview", "offer"];
  const applications: Application[] = chosen.map((c, i) => ({
    id: `applicant-${postingId}-${i}`,
    candidateId: c.id,
    postingId,
    stage: pick(stages),
    appliedAt: new Date(Date.now() - (i + 1) * 6 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - (i + 1) * 6 * 3600 * 1000).toISOString(),
  }));
  writeApplications([...applications, ...readApplications()]);
}

export class PostingLimitError extends Error {}

/** Enforces the plan's active-posting cap (AUDIT.md flagged this as an ungated limit) - "active"
 * means open or paused; closed postings don't count against it. Throws rather than returning
 * null so the UI can show a real upsell message instead of silently doing nothing. Real mode
 * enforces the same limit server-side (arena-api's JobPostingService); a 400 from there gets
 * re-thrown as the same PostingLimitError so the UI's catch block works in both modes. */
export async function createPosting(input: Omit<JobPosting, "id" | "status" | "createdAt">): Promise<JobPosting> {
  if (isRealMode()) {
    try {
      return await apiFetch<JobPosting>("/enterprise/postings", { method: "POST", body: input });
    } catch (err) {
      if (err instanceof ApiError) throw new PostingLimitError(err.message);
      throw err;
    }
  }
  const profile = getEnterpriseProfile();
  const limit = POSTING_LIMITS[profile?.plan ?? "free"];
  const activeCount = readPostings().filter((p) => p.status !== "closed").length;
  if (activeCount >= limit) {
    throw new PostingLimitError(`Your ${profile?.plan ?? "free"} plan allows ${limit} active posting${limit === 1 ? "" : "s"}.`);
  }
  const posting: JobPosting = { ...input, id: `posting-${Date.now()}`, status: "open", createdAt: new Date().toISOString() };
  writePostings([posting, ...readPostings()]);
  seedApplicants(posting.id, posting.industry);
  return delay(posting, 400);
}

export async function setPostingStatus(id: string, status: JobPosting["status"]): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/enterprise/postings/${id}/status`, { method: "PUT", body: { status } });
    return;
  }
  writePostings(readPostings().map((p) => (p.id === id ? { ...p, status } : p)));
  return delay(undefined, 200);
}

export async function getApplicantsForPosting(postingId: string): Promise<(Application & { candidate: ReturnType<typeof getCandidateById> })[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<Application & { candidate: ReturnType<typeof getCandidateById> }>>(
      `/enterprise/postings/${postingId}/applicants`,
      { query: { page: 0, size: 100 } },
    );
    return page.content;
  }
  const applicants = readApplications().filter((a) => a.postingId === postingId);
  return delay(applicants.map((a) => ({ ...a, candidate: getCandidateById(a.candidateId) })), 250);
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
  if (isRealMode()) {
    return apiFetch<ApplicantResponseWire>(`/enterprise/applicants/${applicationId}`)
      .then((res) => ({
        id: res.id, candidateId: res.candidateId, postingId: res.jobPostingId,
        stage: res.stage as ApplicationStage, appliedAt: res.appliedAt, updatedAt: res.appliedAt,
      }))
      .catch(() => null);
  }
  return delay(readApplications().find((a) => a.id === applicationId) ?? null, 150);
}

export async function moveApplicantStage(applicationId: string, stage: ApplicationStage): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/enterprise/applicants/${applicationId}/stage`, { method: "PUT", body: { stage } });
    return;
  }
  writeApplications(
    readApplications().map((a) => (a.id === applicationId ? { ...a, stage, updatedAt: new Date().toISOString() } : a)),
  );
  return delay(undefined, 200);
}

/** No dedicated count endpoint exists server-side — fans out over (typically few) postings and
 * sums each page's totalElements rather than fetching every applicant row. Bounded by posting
 * count, not applicant count, so this stays cheap even for a busy pipeline. */
export async function getAllApplicantCounts(): Promise<number> {
  if (isRealMode()) {
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
  return delay(readApplications().filter((a) => a.postingId).length, 100);
}

// ---- Talent Universe search ----

const FIT_BLURBS = [
  "Strong overlap with what you're hiring for, verified skills to back it up.",
  "Comes up frequently in searches like this one — high signal, low noise.",
  "A slightly non-obvious pick, but the skill graph lines up well.",
  "Recently active, open to new roles, and priced within typical range.",
];

export async function searchTalent(query: {
  text?: string;
  industry?: string;
  remoteOnly?: boolean;
}): Promise<{ candidate: ReturnType<typeof getCandidateById>; matchPercentage: number; fitBlurb: string; availability: string }[]> {
  if (isRealMode()) {
    const page = await apiFetch<
      PagedResponse<{ candidate: ReturnType<typeof getCandidateById>; matchPercentage: number; fitBlurb: string; availability: string }>
    >("/enterprise/talent/search", {
      // text must always be sent as an explicit string, never omitted - arena-api has a known
      // JDBC null-parameter type-inference bug ("operator does not exist: text ~~ bytea") when
      // this query param is absent entirely.
      query: { text: query.text ?? "", industry: query.industry, remoteOnly: query.remoteOnly, page: 0, size: 50 },
    });
    return page.content;
  }
  const q = (query.text || "").toLowerCase();
  const results = MOCK_CANDIDATES.filter((c) => {
    if (query.industry && query.industry !== "All" && c.industry !== query.industry) return false;
    if (query.remoteOnly && !c.remote) return false;
    if (!c.consent.searchableByEnterprises) return false;
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.skills.some((s) => s.name.toLowerCase().includes(q)) ||
      c.location.toLowerCase().includes(q)
    );
  }).map((c) => ({
    candidate: c,
    matchPercentage: 70 + Math.round((c.careerHealth / 100) * 28),
    fitBlurb: pick(FIT_BLURBS),
    availability: c.openTo.join(", "),
  }));
  return delay(results.sort((a, b) => b.matchPercentage - a.matchPercentage), 350);
}

export async function getCandidateDetail(id: string): Promise<CandidateProfile | null> {
  if (isRealMode()) {
    return apiFetch<CandidateProfile>(`/enterprise/talent/${id}`).catch(() => null);
  }
  return delay(getCandidateById(id) ?? null, 200);
}

/** True when this candidate directly applied to one of *my* postings — direct applicants are
 * visible for free (they reached out first), unlike a cold Talent Universe search result,
 * which still costs an unlock credit. Mock-only for now: arena-api doesn't yet expose this
 * distinction (a real backend addition, not implemented here), so real mode conservatively
 * treats every candidate as requiring a credit unlock, same as a cold search result. */
export async function hasDirectlyApplied(candidateId: string): Promise<boolean> {
  if (isRealMode()) return false;
  const myPostingIds = new Set(readPostings().map((p) => p.id));
  const applied = readApplications().some((a) => a.candidateId === candidateId && a.postingId && myPostingIds.has(a.postingId));
  return delay(applied, 100);
}

// Which candidates *this browser* has already unlocked — a client-side convenience cache in
// both modes. Real mode's actual credit spend is still enforced and recorded server-side by
// the /unlock call below; this just avoids re-querying "am I unlocked with them" separately.
const UNLOCKED_KEY = "arena_unlocked_candidates";
export function getUnlockedCandidateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(UNLOCKED_KEY) || "[]");
  } catch {
    return [];
  }
}
export function unlockCandidate(id: string) {
  const unlocked = getUnlockedCandidateIds();
  if (!unlocked.includes(id)) localStorage.setItem(UNLOCKED_KEY, JSON.stringify([...unlocked, id]));
  if (isRealMode()) apiFetch(`/enterprise/talent/${id}/unlock`, { method: "POST" }).catch(() => {});
}
