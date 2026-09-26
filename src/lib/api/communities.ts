import type { Community, CommunityMember, Post } from "@/lib/types";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { getFeed } from "./posts";

/** Discuss (Phase 2): communities and thread lists. Mock mode has no communities - it returns
 *  empty lists and the general thread list from mock posts, so the screens still render. */
export type ThreadSort = "new" | "top";

export async function getThreads(opts: { community?: string; sort?: ThreadSort; page?: number; size?: number } = {}): Promise<Post[]> {
  const { community, sort = "new", page = 0, size = 30 } = opts;
  if (isRealMode()) return apiFetch<Post[]>("/discuss/threads", { query: { community, sort, page, size } });
  if (community) return [];
  const posts = (await getFeed(0, 200)).filter((p) => p.intentType === "ask" || p.intentType === "update" || p.intentType === "offer");
  const sorted = sort === "top" ? posts.slice().sort((a, b) => (b.score ?? b.reactionCount) - (a.score ?? a.reactionCount)) : posts;
  return sorted.slice(page * size, page * size + size);
}

export async function listCommunities(q = ""): Promise<Community[]> {
  if (isRealMode()) return apiFetch<Community[]>("/communities", { query: { q } });
  return [];
}

export async function myCommunities(): Promise<Community[]> {
  if (isRealMode()) return apiFetch<Community[]>("/communities/mine");
  return [];
}

export function getCommunity(slug: string): Promise<Community> {
  return apiFetch<Community>(`/communities/${encodeURIComponent(slug)}`);
}

export function getModerators(slug: string): Promise<CommunityMember[]> {
  return apiFetch<CommunityMember[]>(`/communities/${encodeURIComponent(slug)}/moderators`);
}

export function createCommunity(input: { name: string; description?: string; emoji?: string; allowAnonymous?: boolean }): Promise<Community> {
  return apiFetch<Community>("/communities", { method: "POST", body: input });
}

export function updateCommunity(slug: string, input: { description?: string; emoji?: string; allowAnonymous?: boolean }): Promise<Community> {
  return apiFetch<Community>(`/communities/${encodeURIComponent(slug)}`, { method: "PATCH", body: input });
}

export function joinCommunity(slug: string): Promise<Community> {
  return apiFetch<Community>(`/communities/${encodeURIComponent(slug)}/join`, { method: "POST" });
}

export function leaveCommunity(slug: string): Promise<Community> {
  return apiFetch<Community>(`/communities/${encodeURIComponent(slug)}/join`, { method: "DELETE" });
}

export function setModerator(slug: string, userId: string, value: boolean): Promise<CommunityMember> {
  return apiFetch<CommunityMember>(`/communities/${encodeURIComponent(slug)}/members/${userId}/moderator`, { method: "PUT", body: { value } });
}

export function banMember(slug: string, userId: string, value: boolean): Promise<CommunityMember> {
  return apiFetch<CommunityMember>(`/communities/${encodeURIComponent(slug)}/members/${userId}/ban`, { method: "PUT", body: { value } });
}

/** Ban a post's author from the community without learning who they are (works for anonymous posts). */
export async function banPostAuthor(slug: string, postId: string): Promise<void> {
  await apiFetch<void>(`/communities/${encodeURIComponent(slug)}/posts/${postId}/ban-author`, { method: "POST" });
}

export async function removeCommunityPost(slug: string, postId: string, reason?: string): Promise<void> {
  await apiFetch<void>(`/communities/${encodeURIComponent(slug)}/posts/${postId}/remove`, { method: "POST", body: { reason } });
}
