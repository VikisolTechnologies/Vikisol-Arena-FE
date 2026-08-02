import type { Application, ApplicationStage, EnterpriseProfile, JobPosting } from "@/lib/types";
import { getEnterpriseProfile, saveEnterpriseProfile } from "@/lib/session";
import { MOCK_CANDIDATES, getCandidateById } from "@/lib/mock/candidates";
import { pick, pickN } from "@/lib/mock/seed";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";

// ---- Enterprise profile ----

export async function getMyEnterpriseProfile(): Promise<EnterpriseProfile | null> {
  return delay(getEnterpriseProfile(), 200);
}

export async function saveMyEnterpriseProfile(profile: EnterpriseProfile): Promise<EnterpriseProfile> {
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
  return delay(readPostings(), 250);
}

export async function getPosting(id: string): Promise<JobPosting | undefined> {
  return delay(readPostings().find((p) => p.id === id), 150);
}

/** Seeds 3-6 realistic applicants from the candidate pool so a fresh posting isn't empty —
 * written into the same unified applications store the candidate side reads, just with
 * postingId set instead of jobId. */
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

export async function createPosting(input: Omit<JobPosting, "id" | "status" | "createdAt">): Promise<JobPosting> {
  const posting: JobPosting = { ...input, id: `posting-${Date.now()}`, status: "open", createdAt: new Date().toISOString() };
  writePostings([posting, ...readPostings()]);
  seedApplicants(posting.id, posting.industry);
  return delay(posting, 400);
}

export async function setPostingStatus(id: string, status: JobPosting["status"]): Promise<void> {
  writePostings(readPostings().map((p) => (p.id === id ? { ...p, status } : p)));
  return delay(undefined, 200);
}

export async function getApplicantsForPosting(postingId: string): Promise<(Application & { candidate: ReturnType<typeof getCandidateById> })[]> {
  const applicants = readApplications().filter((a) => a.postingId === postingId);
  return delay(applicants.map((a) => ({ ...a, candidate: getCandidateById(a.candidateId) })), 250);
}

export async function moveApplicantStage(applicationId: string, stage: ApplicationStage): Promise<void> {
  writeApplications(
    readApplications().map((a) => (a.id === applicationId ? { ...a, stage, updatedAt: new Date().toISOString() } : a)),
  );
  return delay(undefined, 200);
}

export async function getAllApplicantCounts(): Promise<number> {
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

export async function getCandidateDetail(id: string) {
  return delay(getCandidateById(id) ?? null, 200);
}

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
}
