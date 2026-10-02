import type { Company, Job, Post, Project } from "@/lib/types";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { getFeed } from "./posts";
import { getJobs } from "./jobs";
import { getProjects } from "./market";

/** Arena-wide search (GET /search) - activities, discussions, jobs, projects, companies and
 * (MARATHON-FE area 5) people. */
export type SearchType = "all" | "activities" | "discussions" | "jobs" | "projects" | "companies" | "people" | "skills";

/** A coarse band ("within 2 km"), never the exact distance (ARCHITECT-REVIEW-BE-1 blocker #1 -
 * an exact distance from an attacker-controlled point lets someone triangulate a real location).
 * Only set when `near=true` was sent and the person shares their location. */
export interface SearchPerson {
  userId: string;
  name: string;
  avatarEmoji: string;
  photoUrl?: string;
  title?: string;
  skills: string[];
  interests: string[];
  distanceBand?: string;
}

export interface SearchResults {
  query: string;
  activities: Post[];
  discussions: Post[];
  jobs: Job[];
  projects: Project[];
  companies: Company[];
  people: SearchPerson[];
}

export const EMPTY_RESULTS: Omit<SearchResults, "query"> = { activities: [], discussions: [], jobs: [], projects: [], companies: [], people: [] };

/** `near: true` asks for "near me" (the viewer's own stored location, never an arbitrary point -
 * same blocker-#1 reasoning as above) within `radiusKm` (backend default 5, floor 2, max 50). */
export async function search(q: string, type: SearchType = "all", limit = 20, opts: { near?: boolean; radiusKm?: number } = {}): Promise<SearchResults> {
  if (isRealMode()) return apiFetch<SearchResults>("/search", { query: { q, type, limit, near: opts.near ? "true" : undefined, radiusKm: opts.radiusKm } });

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
    discussions: want("discussions") ? posts.filter((p) => (p.intentType === "ask" || p.intentType === "update" || p.intentType === "offer") && postHit(p)).slice(0, limit) : [],
    jobs: want("jobs") ? jobs.filter((j) => matches(j.title, j.company, j.location, j.skills, j.description)).slice(0, limit) : [],
    projects: want("projects") ? projects.filter((p) => matches(p.title, p.description, p.skills)).slice(0, limit) : [],
    companies: [],
    people: [],
  };
}
