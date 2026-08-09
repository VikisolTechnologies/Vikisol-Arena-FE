import type { FollowCounts, FollowerEntry } from "@/lib/types";
import { MOCK_FOLLOWS } from "@/lib/mock/follows";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

const KEY = "arena_follows";

function readFollows(): { followerId: string; followingId: string; createdAt: string }[] {
  if (typeof window === "undefined") return MOCK_FOLLOWS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : MOCK_FOLLOWS;
  } catch {
    return MOCK_FOLLOWS;
  }
}
function writeFollows(follows: { followerId: string; followingId: string; createdAt: string }[]) {
  localStorage.setItem(KEY, JSON.stringify(follows));
}

export async function follow(userId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/follows/${userId}`, { method: "POST" });
    return;
  }
  const follows = readFollows();
  if (follows.some((f) => f.followerId === CURRENT_CANDIDATE_ID && f.followingId === userId)) return;
  writeFollows([...follows, { followerId: CURRENT_CANDIDATE_ID, followingId: userId, createdAt: new Date().toISOString() }]);
  await delay(undefined, 200);
}

export async function unfollow(userId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/follows/${userId}`, { method: "DELETE" });
    return;
  }
  writeFollows(readFollows().filter((f) => !(f.followerId === CURRENT_CANDIDATE_ID && f.followingId === userId)));
  await delay(undefined, 200);
}

export async function getCounts(userId: string): Promise<FollowCounts> {
  if (isRealMode()) return apiFetch<FollowCounts>(`/follows/${userId}/counts`);
  const follows = readFollows();
  return delay({
    userId,
    followerCount: follows.filter((f) => f.followingId === userId).length,
    followingCount: follows.filter((f) => f.followerId === userId).length,
    viewerFollows: follows.some((f) => f.followerId === CURRENT_CANDIDATE_ID && f.followingId === userId),
  }, 200);
}

function toEntry(userId: string, createdAt: string): FollowerEntry {
  const c = getCandidateById(userId);
  return { userId, name: c?.name ?? "Arena member", emoji: c?.avatarEmoji ?? "🧑🏽", followedAt: createdAt };
}

export async function getMyFollowers(): Promise<FollowerEntry[]> {
  if (isRealMode()) return apiFetch<FollowerEntry[]>("/follows/me/followers");
  return delay(readFollows().filter((f) => f.followingId === CURRENT_CANDIDATE_ID)
    .map((f) => toEntry(f.followerId, f.createdAt)), 200);
}

export async function getMyFollowing(): Promise<FollowerEntry[]> {
  if (isRealMode()) return apiFetch<FollowerEntry[]>("/follows/me/following");
  return delay(readFollows().filter((f) => f.followerId === CURRENT_CANDIDATE_ID)
    .map((f) => toEntry(f.followingId, f.createdAt)), 200);
}
