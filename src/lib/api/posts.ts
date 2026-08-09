import type { Post, PostIntentType, PostAudience, PostVisibility, PostJoinRequest, PostComment, VerificationLevel } from "@/lib/types";
import { MOCK_POSTS, MOCK_POST_JOIN_REQUESTS } from "@/lib/mock/posts";
import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getMockDateOfBirth } from "./verification";
import { haversineKm, isAdult, jitterCoord } from "@/lib/geo";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

const AGE_GATE_MESSAGE = "Add your date of birth in Settings before creating or joining an activity.";
const AGE_GATE_MINOR_MESSAGE = "You must be 18 or older to create or join an activity.";

// Mirrors PostService.requireAdult()'s exact gate for mock mode - only ACTIVITY carries the
// real-world-meetup risk the age-gate exists for (see DECISIONS.md).
function requireAdultMock(intentType: PostIntentType) {
  if (intentType !== "activity") return;
  const dob = getMockDateOfBirth();
  if (!dob) throw new Error(AGE_GATE_MESSAGE);
  if (!isAdult(dob)) throw new Error(AGE_GATE_MINOR_MESSAGE);
}

const POSTS_KEY = "arena_posts";
const JOINS_KEY = "arena_post_joins";
const COMMENTS_KEY = "arena_post_comments";
const REACTIONS_KEY = "arena_post_reactions";

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

function readComments(): PostComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? (JSON.parse(raw) as PostComment[]) : [];
  } catch {
    return [];
  }
}
function writeComments(comments: PostComment[]) {
  localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
}

// { [postId]: true } for CURRENT_CANDIDATE_ID's own reaction - mock mode only ever needs the
// viewer's own state, mirroring blocks.ts/companies.ts's small-dedicated-key pattern.
function readReactions(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}
function writeReactions(reactions: Record<string, boolean>) {
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
}

export interface CreatePostInput {
  intentType: PostIntentType;
  body: string;
  locationText?: string;
  audience?: PostAudience;
  visibility?: PostVisibility;
  capacity?: number;
  tags?: string[];
  startsAt?: string;
  endsAt?: string;
  /** Only ever sent when the author explicitly taps "use my current location" in the composer -
   * its own in-the-moment browser Geolocation prompt, independent of account-wide discovery
   * consent. */
  lat?: number;
  lng?: number;
  exactMeetingPoint?: string;
  requiredVerificationLevel?: VerificationLevel;
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
        startsAt: input.startsAt, endsAt: input.endsAt, lat: input.lat, lng: input.lng,
        exactMeetingPoint: input.exactMeetingPoint, requiredVerificationLevel: input.requiredVerificationLevel,
      },
    });
  }
  requireAdultMock(input.intentType);
  const me = getCandidateById(CURRENT_CANDIDATE_ID);
  const approx = input.lat != null && input.lng != null ? jitterCoord(input.lat, input.lng) : undefined;
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
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    tags: input.tags ?? [],
    mediaUrls: [],
    joinable: input.intentType === "activity" || input.intentType === "ask",
    mine: true,
    createdAt: new Date().toISOString(),
    approxLat: approx?.lat,
    approxLng: approx?.lng,
    exactMeetingPoint: input.exactMeetingPoint,
    requiredVerificationLevel: input.requiredVerificationLevel,
    commentCount: 0,
    reactionCount: 0,
    myReacted: false,
    authorJoinCount: 0,
    authorAccountAgeDays: 30,
  };
  writePosts([post, ...readPosts()]);
  return delay(post, 300);
}

export async function cancelPost(postId: string): Promise<Post> {
  if (isRealMode()) return apiFetch<Post>(`/posts/${postId}/cancel`, { method: "PUT" });
  const posts = readPosts();
  const updated = posts.map((p) => (p.id === postId ? { ...p, status: "cancelled" as const } : p));
  writePosts(updated);
  const result = updated.find((p) => p.id === postId);
  if (!result) throw new Error("Post not found");
  return delay(result, 250);
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  withinHours?: number;
  intentType?: PostIntentType;
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md §5's map/nearby discovery screen. Neither the real endpoint
// nor mock mode returns a precomputed distance - both compute it client-side (haversineKm)
// against the viewer-supplied center, which is exactly as safe to do in the browser as the
// coordinates it's already operating on (see lib/geo.ts).
export async function getNearby(query: NearbyQuery): Promise<Post[]> {
  const radiusKm = query.radiusKm ?? 5;
  if (isRealMode()) {
    const results = await apiFetch<Post[]>("/posts/nearby", {
      query: { lat: query.lat, lng: query.lng, radiusKm, withinHours: query.withinHours, intentType: query.intentType },
    });
    return results.map((p) => ({
      ...p,
      distanceKm: p.approxLat != null && p.approxLng != null ? haversineKm(query.lat, query.lng, p.approxLat, p.approxLng) : undefined,
    }));
  }
  const now = Date.now();
  const withinMs = query.withinHours ? query.withinHours * 3600000 : undefined;
  return delay(
    readPosts()
      .filter((p) => p.joinable && p.status === "open" && p.approxLat != null && p.approxLng != null)
      .filter((p) => !query.intentType || p.intentType === query.intentType)
      .filter((p) => !withinMs || !p.startsAt || new Date(p.startsAt).getTime() - now <= withinMs)
      .map((p) => ({ ...p, distanceKm: haversineKm(query.lat, query.lng, p.approxLat!, p.approxLng!) }))
      .filter((p) => p.distanceKm! <= radiusKm)
      .sort((a, b) => a.distanceKm! - b.distanceKm!),
    300,
  );
}

export async function requestJoin(postId: string): Promise<PostJoinRequest> {
  if (isRealMode()) return apiFetch<PostJoinRequest>(`/posts/${postId}/joins`, { method: "POST" });
  const posts = readPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) throw new Error("Post not found");
  requireAdultMock(post.intentType);
  // requiredVerificationLevel gating is left to the real backend only (VerificationService's
  // full tier comparison) - mock mode's simplified age-gate above already proves the pattern
  // works end-to-end; re-deriving the same >= comparison against localStorage state here would
  // duplicate real logic for a demo-only path with no safety stakes.
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

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C - trending posts, reused as a feed sort option
// rather than a separate subsystem (see DECISIONS.md). Mock mode ranks by the same seeded
// commentCount/reactionCount/spotsFilled fields, recency-decayed - an honest simplification
// since there's no real engagement-event log in mock mode to replay.
export async function getTrending(page = 0, size = 20): Promise<Post[]> {
  if (isRealMode()) return apiFetch<Post[]>("/posts/trending", { query: { page, size } });
  const now = Date.now();
  const scored = [...readPosts()]
    .filter((p) => p.status === "open")
    .map((p) => {
      const hoursOld = (now - new Date(p.createdAt).getTime()) / 3600000;
      const engagement = p.spotsFilled * 3 + p.commentCount * 2 + p.reactionCount;
      return { post: p, score: engagement * Math.pow(0.5, hoursOld / 48) };
    })
    .sort((a, b) => b.score - a.score)
    .map((s) => s.post);
  return delay(scored.slice(page * size, page * size + size), 250);
}

// Profile revamp's "activity" tab (Phase C) - a target user's own visible-to-viewer posts,
// same audience-gate simplification the real backend applies (GLOBAL always visible, FOLLOWERS
// only if the viewer follows them, self always sees everything, CANCELLED hidden).
export async function getUserPosts(targetUserId: string, page = 0, size = 20): Promise<PagedResponse<Post>> {
  if (isRealMode()) return apiFetch<PagedResponse<Post>>(`/posts/by-user/${targetUserId}`, { query: { page, size } });
  const isSelf = targetUserId === CURRENT_CANDIDATE_ID;
  const visible = readPosts()
    .filter((p) => p.authorUserId === targetUserId && p.status !== "cancelled")
    .filter((p) => isSelf || p.audience === "global")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const content = visible.slice(page * size, page * size + size);
  return delay({
    content, page, size, totalElements: visible.length,
    totalPages: Math.ceil(visible.length / size), last: (page + 1) * size >= visible.length,
  }, 200);
}

export async function getComments(postId: string): Promise<PostComment[]> {
  if (isRealMode()) return apiFetch<PostComment[]>(`/posts/${postId}/comments`);
  return delay(readComments().filter((c) => c.postId === postId), 200);
}

export async function addComment(postId: string, content: string): Promise<PostComment> {
  if (isRealMode()) return apiFetch<PostComment>(`/posts/${postId}/comments`, { method: "POST", body: { content } });
  const me = getCandidateById(CURRENT_CANDIDATE_ID);
  const comment: PostComment = {
    id: `comment-${Date.now()}`,
    postId,
    authorUserId: CURRENT_CANDIDATE_ID,
    authorName: me?.name ?? "You",
    authorEmoji: me?.avatarEmoji ?? "🧑🏽",
    content,
    createdAt: new Date().toISOString(),
  };
  writeComments([...readComments(), comment]);
  writePosts(readPosts().map((p) => (p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p)));
  return delay(comment, 250);
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
    return;
  }
  writeComments(readComments().filter((c) => c.id !== commentId));
  writePosts(readPosts().map((p) => (p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p)));
  await delay(undefined, 200);
}

export async function reactToPost(postId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/posts/${postId}/react`, { method: "POST" });
    return;
  }
  const reactions = readReactions();
  if (!reactions[postId]) {
    writeReactions({ ...reactions, [postId]: true });
    writePosts(readPosts().map((p) => (p.id === postId ? { ...p, reactionCount: p.reactionCount + 1, myReacted: true } : p)));
  }
  await delay(undefined, 150);
}

export async function unreactToPost(postId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/posts/${postId}/react`, { method: "DELETE" });
    return;
  }
  const reactions = readReactions();
  if (reactions[postId]) {
    const rest = { ...reactions };
    delete rest[postId];
    writeReactions(rest);
    writePosts(readPosts().map((p) => (p.id === postId ? { ...p, reactionCount: Math.max(0, p.reactionCount - 1), myReacted: false } : p)));
  }
  await delay(undefined, 150);
}

// §4 safety-audit fix: "report ... everywhere" - posts are now directly reportable, not just
// via a Room (which UPDATE posts and not-yet-joined ACTIVITY/ASK posts never had). Mock mode
// has no moderation backend to write to - same "confirms to the user, nothing durable to
// persist locally" scope as reportRoom in rooms.ts.
export async function reportPost(postId: string, reason: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/posts/${postId}/report`, { method: "POST", body: { reason } });
    return;
  }
  await delay(undefined, 200);
}
