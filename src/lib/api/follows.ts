import type { FollowCounts, FollowerEntry } from "@/lib/types";
import { apiFetch } from "./httpClient";

export async function follow(userId: string): Promise<void> {
  await apiFetch<void>(`/follows/${userId}`, { method: "POST" });
  return;
}

export async function unfollow(userId: string): Promise<void> {
  await apiFetch<void>(`/follows/${userId}`, { method: "DELETE" });
  return;
}

export async function getCounts(userId: string): Promise<FollowCounts> {
  return apiFetch<FollowCounts>(`/follows/${userId}/counts`);
}

export async function getMyFollowers(): Promise<FollowerEntry[]> {
  return apiFetch<FollowerEntry[]>("/follows/me/followers");
}

export async function getMyFollowing(): Promise<FollowerEntry[]> {
  return apiFetch<FollowerEntry[]>("/follows/me/following");
}
