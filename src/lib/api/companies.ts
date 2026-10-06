import type { Company, Job } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C "company pages" - a talent-facing read layer over
// enterprise tenants (see DECISIONS.md).

export async function listCompanies(query?: string, page = 0, size = 20): Promise<PagedResponse<Company>> {
  return apiFetch<PagedResponse<Company>>("/companies", { query: { query, page, size } });
}

export async function getCompany(id: string): Promise<Company | undefined> {
  return apiFetch<Company>(`/companies/${id}`).catch(() => undefined);
}

const EMPTY_JOBS_PAGE = { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, last: true };

export async function getCompanyJobs(id: string, page = 0, size = 20): Promise<PagedResponse<Job>> {
  // Safety net (MARATHON-FE Step 1): a bad/retired id 400s or 404s here same as GET /companies/{id}
  // does - without a catch this was an unhandled rejection (and the page stuck on its loading
  // spinner forever) instead of the honest "not available" state getCompany already shows.
  return apiFetch<PagedResponse<Job>>(`/companies/${id}/jobs`, { query: { page, size } }).catch(() => EMPTY_JOBS_PAGE);
}

export async function followCompany(id: string): Promise<void> {
  await apiFetch<void>(`/follows/company/${id}`, { method: "POST" });
  return;
}

export async function unfollowCompany(id: string): Promise<void> {
  await apiFetch<void>(`/follows/company/${id}`, { method: "DELETE" });
  return;
}
