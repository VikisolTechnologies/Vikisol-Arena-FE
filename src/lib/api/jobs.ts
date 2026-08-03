import type { Job } from "@/lib/types";
import { MOCK_JOBS, getJobById } from "@/lib/mock/jobs";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// Real mode fetches one large page rather than building out paginated UI for a list this size -
// the backend has no text-search query param either, so filtering (Discover's filters,
// the command palette's search) stays client-side over this same fetched set in both modes.
const REAL_PAGE_SIZE = 200;

let realJobsCache: Job[] | null = null;

async function fetchAllJobs(): Promise<Job[]> {
  if (realJobsCache) return realJobsCache;
  const page = await apiFetch<PagedResponse<Job>>("/jobs", { query: { page: 0, size: REAL_PAGE_SIZE } });
  realJobsCache = page.content;
  return realJobsCache;
}

export async function getJobs(): Promise<Job[]> {
  if (isRealMode()) return fetchAllJobs();
  return delay(MOCK_JOBS, 300);
}

export async function getJob(id: string): Promise<Job | undefined> {
  if (isRealMode()) {
    return apiFetch<Job>(`/jobs/${id}`).catch(() => undefined);
  }
  return delay(getJobById(id), 250);
}

const PASSED_KEY = "arena_passed_jobs";

// No backend concept of "passed" jobs exists yet (JobController has no such endpoint) - kept
// client-side/localStorage in both modes rather than inventing a server feature out of scope here.
export function getPassedJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PASSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function passOnJob(jobId: string) {
  const passed = getPassedJobIds();
  if (!passed.includes(jobId)) localStorage.setItem(PASSED_KEY, JSON.stringify([...passed, jobId]));
}
