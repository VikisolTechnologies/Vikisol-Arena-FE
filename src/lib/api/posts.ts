import type { Post, PostIntentType, PostAudience, PostVisibility, PostJoinRequest } from "@/lib/types";
import { MOCK_POSTS, MOCK_POST_JOIN_REQUESTS } from "@/lib/mock/posts";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

const POSTS_KEY = "arena_posts";
const JOINS_KEY = "arena_post_joins";

function readPosts(): Post[] {
  if (typeof window === "undefined") return MOCK_POSTS;
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return raw ? (JSON.parse(raw) as Post[]) : MOCK_POSTS;
  } catch {
    return MOCK_POSTS;
  }
}
function writePosts(posts: Post[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function readJoins(): PostJoinRequest[] {
  if (typeof window === "undefined") return MOCK_POST_JOIN_REQUESTS;
  try {
    const raw = localStorage.getItem(JOINS_KEY);
    return raw ? (JSON.parse(raw) as PostJoinRequest[]) : MOCK_POST_JOIN_REQUESTS;
  } catch {
    return MOCK_POST_JOIN_REQUESTS;
  }
}
function writeJoins(joins: PostJoinRequest[]) {
  localStorage.setItem(JOINS_KEY, JSON.stringify(joins));
}

export interface CreatePostInput {
  intentType: PostIntentType;
  body: string;
  locationText?: string;
  audience?: PostAudience;
  visibility?: PostVisibility;
  capacity?: number;
  tags?: string[];
}

// Recency + follows-affinity, mirrors FeedRankingService's scoring shape client-side for mock
// mode (no real "follows" affinity here since mock mode has no persisted follow graph feeding
// this - recency-only is an honest simplification for the demo path).
export async function getFeed(page = 0, size = 20): Promise<Post[]> {
  if (isRealMode()) return apiFetch<Post[]>("/posts/feed", { query: { page, size } });
  const sorted = [...readPosts()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return delay(sorted.slice(page * size, page * size + size), 250);
}

export async function getPost(id: string): Promise<Post | undefined> {
  if (isRealMode()) return apiFetch<Post>(`/posts/${id}`).catch(() => undefined);
  return delay(readPosts().find((p) => p.id === id), 200);
}

export async function getMyPosts(): Promise<Post[]> {
  if (isRealMode()) {
    const page = await apiFetch<PagedResponse<Post>>("/posts/mine", { query: { page: 0, size: 100 } });
    return page.content;
  }
  return delay(readPosts().filter((p) => p.mine), 200);
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  if (isRealMode()) {
    return apiFetch<Post>("/posts", {
      method: "POST",
      body: {
        intentType: input.intentType, body: input.body, locationText: input.locationText,
        audience: input.audience ?? "global", visibility: input.visibility ?? "public",
        capacity: input.capacity, tags: input.tags ?? [],
      },
    });
  }
  const me = getCandidateById(CURRENT_CANDIDATE_ID);
  const post: Post = {
    id: `post-${Date.now()}`,
    authorUserId: CURRENT_CANDIDATE_ID,
    authorName: me?.name ?? "You",
    authorEmoji: me?.avatarEmoji ?? "🧑🏽",
    intentType: input.intentType,
    body: input.body,
    locationText: input.locationText,
    audience: input.audience ?? "global",
    visibility: input.visibility ?? "public",
    capacity: input.capacity,
    spotsFilled: 0,
    status: "open",
    tags: input.tags ?? [],
    mediaUrls: [],
    joinable: input.intentType === "activity" || input.intentType === "ask",
    mine: true,
    createdAt: new Date().toISOString(),
  };
  writePosts([post, ...readPosts()]);
  return delay(post, 300);
}

export async function requestJoin(postId: string): Promise<PostJoinRequest> {
  if (isRealMode()) return apiFetch<PostJoinRequest>(`/posts/${postId}/joins`, { method: "POST" });
  const posts = readPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error("Post not found");
  const autoApprove = post.visibility === "public";
  const me = getCandidateById(CURRENT_CANDIDATE_ID);
  const joinRequest: PostJoinRequest = {
    id: `join-${Date.now()}`,
    postId,
    userId: CURRENT_CANDIDATE_ID,
    userName: me?.name ?? "You",
    userEmoji: me?.avatarEmoji ?? "🧑🏽",
    status: autoApprove ? "approved" : "pending",
    createdAt: new Date().toISOString(),
  };
  writeJoins([...readJoins(), joinRequest]);
  writePosts(posts.map((p) => (p.id === postId
    ? { ...p, myJoinStatus: joinRequest.status, spotsFilled: autoApprove ? p.spotsFilled + 1 : p.spotsFilled }
    : p)));
  return delay(joinRequest, 250);
}

export async function getJoinRequests(postId: string): Promise<PostJoinRequest[]> {
  if (isRealMode()) return apiFetch<PostJoinRequest[]>(`/posts/${postId}/joins`);
  return delay(readJoins().filter((j) => j.postId === postId), 200);
}

export async function decideJoin(postId: string, joinId: string, approve: boolean): Promise<PostJoinRequest> {
  if (isRealMode()) {
    return apiFetch<PostJoinRequest>(`/posts/${postId}/joins/${joinId}/${approve ? "approve" : "decline"}`, { method: "PUT" });
  }
  const joins = readJoins();
  const newStatus: PostJoinRequest["status"] = approve ? "approved" : "declined";
  const updated = joins.map((j) => (j.id === joinId ? { ...j, status: newStatus } : j));
  writeJoins(updated);
  if (approve) {
    writePosts(readPosts().map((p) => (p.id === postId ? { ...p, spotsFilled: p.spotsFilled + 1 } : p)));
  }
  const result = updated.find((j) => j.id === joinId);
  if (!result) throw new Error("Join request not found");
  return delay(result, 250);
}
