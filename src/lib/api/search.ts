import type { Company, Job, Post, Project } from "@/lib/types";
import { apiFetch } from "./httpClient";

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
  return apiFetch<SearchResults>("/search", { query: { q, type, limit, near: opts.near ? "true" : undefined, radiusKm: opts.radiusKm } });
}
