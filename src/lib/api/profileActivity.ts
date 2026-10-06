import { apiFetch } from "./httpClient";
import { getUserPosts } from "./posts";
import { getNeedOutcomes, type NeedOutcome } from "./needs";
import type { Post } from "@/lib/types";

/** The real routes are /posts/by-user/{id}, /projects/of/{id}, /needs/outcomes/{id}
 *  and /profile/{id}/stats. Each one already hides what the viewer is not allowed to see. */

export interface ProfileStats {
  hosted: number;
  joined: number;
  helped: number;
  projects: number;
}

export interface ProjectCard {
  postId: string;
  title: string;
  status: string;
  role: string;
  createdAt: string;
  outcome?: string | null;
  completedAt?: string | null;
  contributor: boolean;
}

export function getProfileStats(userId: string): Promise<ProfileStats> {
  return apiFetch<ProfileStats>(`/profile/${userId}/stats`, { auth: false });
}

export function getProjectsOf(userId: string): Promise<ProjectCard[]> {
  return apiFetch<ProjectCard[]>(`/projects/of/${userId}`, { query: { page: 0, size: 20 }, auth: false });
}

export interface ProfileActivity {
  posts: Post[];
  projects: ProjectCard[];
  outcomes: NeedOutcome[];
  stats: ProfileStats | null;
}

export async function loadProfileActivity(userId: string): Promise<ProfileActivity> {
  const [posts, projects, outcomes, stats] = await Promise.all([
    getUserPosts(userId, 0, 20).then((page) => page.content ?? []).catch(() => [] as Post[]),
    getProjectsOf(userId).catch(() => [] as ProjectCard[]),
    getNeedOutcomes(userId).catch(() => [] as NeedOutcome[]),
    getProfileStats(userId).catch(() => null),
  ]);
  return { posts: Array.isArray(posts) ? posts : [], projects: Array.isArray(projects) ? projects : [], outcomes: Array.isArray(outcomes) ? outcomes : [], stats };
}
