import type { Company, Job } from "@/lib/types";
import { MOCK_COMPANIES, getCompanyById } from "@/lib/mock/companies";
import { MOCK_JOBS } from "@/lib/mock/jobs";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C "company pages" - a talent-facing read layer over
// enterprise tenants (see DECISIONS.md). Follow state persisted the same small-dedicated-key
// mock pattern as blocks.ts/verification.ts.
const FOLLOWED_KEY = "arena_company_follows";

function readFollowed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FOLLOWED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeFollowed(ids: string[]) {
  localStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
}

function withFollowState(company: Company): Company {
  const followed = readFollowed();
  return {
    ...company,
    followerCount: company.followerCount + (followed.includes(company.id) ? 1 : 0),
    viewerFollows: followed.includes(company.id),
  };
}

export async function listCompanies(query?: string, page = 0, size = 20): Promise<PagedResponse<Company>> {
  if (isRealMode()) return apiFetch<PagedResponse<Company>>("/companies", { query: { query, page, size } });
  const q = (query ?? "").toLowerCase();
  const filtered = MOCK_COMPANIES.filter((c) => !q || c.name.toLowerCase().includes(q)).map(withFollowState);
  return delay({
    content: filtered.slice(page * size, page * size + size), page, size,
    totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size), last: (page + 1) * size >= filtered.length,
  }, 250);
}

export async function getCompany(id: string): Promise<Company | undefined> {
  if (isRealMode()) return apiFetch<Company>(`/companies/${id}`).catch(() => undefined);
  const company = getCompanyById(id);
  return delay(company ? withFollowState(company) : undefined, 200);
}

const EMPTY_JOBS_PAGE = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true };

export async function getCompanyJobs(id: string, page = 0, size = 20): Promise<PagedResponse<Job>> {
  // Safety net (MARATHON-FE Step 1): a bad/retired id 400s or 404s here same as GET /companies/{id}
  // does - without a catch this was an unhandled rejection (and the page stuck on its loading
  // spinner forever) instead of the honest "not available" state getCompany already shows.
  if (isRealMode()) return apiFetch<PagedResponse<Job>>(`/companies/${id}/jobs`, { query: { page, size } }).catch(() => EMPTY_JOBS_PAGE);
  const company = getCompanyById(id);
  const jobs = company ? MOCK_JOBS.filter((j) => j.company === company.name) : [];
  return delay({
    content: jobs.slice(page * size, page * size + size), page, size,
    totalElements: jobs.length, totalPages: Math.ceil(jobs.length / size), last: (page + 1) * size >= jobs.length,
  }, 200);
}

export async function followCompany(id: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/follows/company/${id}`, { method: "POST" });
    return;
  }
  const followed = readFollowed();
  if (!followed.includes(id)) writeFollowed([...followed, id]);
  await delay(undefined, 200);
}

export async function unfollowCompany(id: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/follows/company/${id}`, { method: "DELETE" });
    return;
  }
  writeFollowed(readFollowed().filter((c) => c !== id));
  await delay(undefined, 200);
}
