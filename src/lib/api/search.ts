import type { Company, Job, Post, Project } from "@/lib/types";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { getFeed } from "./posts";
import { getJobs } from "./jobs";
import { getProjects } from "./market";

/** Arena-wide search (GET /search) - activities, discussions, jobs, projects and companies. */
export type SearchType = "all" | "activities" | "discussions" | "jobs" | "projects" | "companies";

export interface SearchResults {
  query: string;
  activities: Post[];
  discussions: Post[];
  jobs: Job[];
  projects: Project[];
  companies: Company[];
}

export const EMPTY_RESULTS: Omit<SearchResults, "query"> = { activities: [], discussions: [], jobs: [], projects: [], companies: [] };

export async function search(q: string, type: SearchType = "all", limit = 20): Promise<SearchResults> {
  if (isRealMode()) return apiFetch<SearchResults>("/search", { query: { q, type, limit } });

  // Mock mode: same "every word must appear" rule as the backend's SearchText, over mock data.
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const matches = (...fields: (string | string[] | undefined)[]) => {
    const hay = fields.flat().filter(Boolean).join(" ").toLowerCase();
    return terms.length > 0 && terms.every((t) => hay.includes(t));
  };
  const want = (t: SearchType) => type === "all" || type === t;
  const [posts, jobs, projects] = await Promise.all([getFeed(0, 500), getJobs(), getProjects()]);
  const postHit = (p: Post) => matches(p.title, p.body, p.locationText, p.authorName, p.tags);
  return {
    query: q,
    activities: want("activities") ? posts.filter((p) => p.intentType === "activity" && postHit(p)).slice(0, limit) : [],
    discussions: want("discussions") ? posts.filter((p) => (p.intentType === "ask" || p.intentType === "update") && postHit(p)).slice(0, limit) : [],
    jobs: want("jobs") ? jobs.filter((j) => matches(j.title, j.company, j.location, j.skills, j.description)).slice(0, limit) : [],
    projects: want("projects") ? projects.filter((p) => matches(p.title, p.description, p.skills)).slice(0, limit) : [],
    companies: [],
  };
}
