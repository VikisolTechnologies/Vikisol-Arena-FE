import type { Post, PostIntentType, PostAudience, PostVisibility, PostJoinRequest, PostComment, VerificationLevel } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

// PART 6 SAVE - kept under /posts (see PostController's own comment), matching every other
// post-interaction endpoint in this client.
export async function savePost(postId: string): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/save`, { method: "POST" });
}

export async function unsavePost(postId: string): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/save`, { method: "DELETE" });
}

export async function getSavedPosts(page = 0, size = 20): Promise<Post[]> {
  const paged = await apiFetch<PagedResponse<Post>>("/posts/saved", { query: { page, size } });
  return paged.content;
}

export interface CreatePostInput {
  intentType: PostIntentType;
  title?: string;
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
  /** Photo/video URLs already uploaded via src/lib/api/media.ts. */
  mediaUrls?: string[];
  /** Discuss community (id) to post a question/update into; absent = general Discuss. */
  communityId?: string;
  /** Show under an alias instead of your name (questions/updates only). */
  anonymous?: boolean;
}

// Recency + follows-affinity, mirrors FeedRankingService's scoring shape client-side for mock
// mode (no real "follows" affinity here since mock mode has no persisted follow graph feeding
// this - recency-only is an honest simplification for the demo path).
export async function getFeed(page = 0, size = 20): Promise<Post[]> {
  return apiFetch<Post[]>("/posts/feed", { query: { page, size } });
}

export async function getPost(id: string): Promise<Post | undefined> {
  return apiFetch<Post>(`/posts/${id}`).catch(() => undefined);
}

export async function getMyPosts(): Promise<Post[]> {
  const page = await apiFetch<PagedResponse<Post>>("/posts/mine", { query: { page: 0, size: 100 } });
  return page.content;
}

export async function getJoinedPosts(): Promise<Post[]> {
  const page = await apiFetch<PagedResponse<Post>>("/posts/joined", { query: { page: 0, size: 100 } });
  return page.content;
}

export async function closeNeed(postId: string): Promise<Post> {
  return apiFetch<Post>(`/posts/${postId}/status`, { method: "PUT" });
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  return apiFetch<Post>("/posts", {
    method: "POST",
    body: {
      intentType: input.intentType, title: input.title, body: input.body, locationText: input.locationText,
      audience: input.audience ?? "global", visibility: input.visibility ?? "public",
      capacity: input.capacity, tags: input.tags ?? [], mediaUrls: input.mediaUrls ?? [], communityId: input.communityId, anonymous: input.anonymous,
      startsAt: input.startsAt, endsAt: input.endsAt, lat: input.lat, lng: input.lng,
      exactMeetingPoint: input.exactMeetingPoint, requiredVerificationLevel: input.requiredVerificationLevel,
    },
  });
}

export async function cancelPost(postId: string): Promise<Post> {
  return apiFetch<Post>(`/posts/${postId}/cancel`, { method: "PUT" });
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
  const results = await apiFetch<Post[]>("/posts/nearby", {
    query: { lat: query.lat, lng: query.lng, radiusKm, withinHours: query.withinHours, intentType: query.intentType },
  });
  return results.map((p) => ({
    ...p,
    distanceKm: p.approxLat != null && p.approxLng != null ? haversineKm(query.lat, query.lng, p.approxLat, p.approxLng) : undefined,
  }));
}

export async function requestJoin(postId: string): Promise<PostJoinRequest> {
  return apiFetch<PostJoinRequest>(`/posts/${postId}/joins`, { method: "POST" });
}

export async function withdrawJoin(postId: string): Promise<PostJoinRequest> {
  return apiFetch<PostJoinRequest>(`/posts/${postId}/joins/me`, { method: "DELETE" });
}

export async function recordJoinOutcome(postId: string, joinId: string, outcome: "attended" | "no_show"): Promise<PostJoinRequest> {
  return apiFetch<PostJoinRequest>(`/posts/${postId}/joins/${joinId}/outcome`, { method: "PUT", body: { outcome } });
}

export async function getJoinRequests(postId: string): Promise<PostJoinRequest[]> {
  return apiFetch<PostJoinRequest[]>(`/posts/${postId}/joins`);
}

export async function decideJoin(postId: string, joinId: string, approve: boolean): Promise<PostJoinRequest> {
  return apiFetch<PostJoinRequest>(`/posts/${postId}/joins/${joinId}/${approve ? "approve" : "decline"}`, { method: "PUT" });
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C - trending posts, reused as a feed sort option
// rather than a separate subsystem (see DECISIONS.md). Mock mode ranks by the same seeded
// commentCount/reactionCount/spotsFilled fields, recency-decayed - an honest simplification
// since there's no real engagement-event log in mock mode to replay.
export async function getTrending(page = 0, size = 20): Promise<Post[]> {
  return apiFetch<Post[]>("/posts/trending", { query: { page, size } });
}

// Profile revamp's "activity" tab (Phase C) - a target user's own visible-to-viewer posts,
// same audience-gate simplification the real backend applies (GLOBAL always visible, FOLLOWERS
// only if the viewer follows them, self always sees everything, CANCELLED hidden).
export async function getUserPosts(targetUserId: string, page = 0, size = 20): Promise<PagedResponse<Post>> {
  return apiFetch<PagedResponse<Post>>(`/posts/by-user/${targetUserId}`, { query: { page, size } });
}

export async function getComments(postId: string): Promise<PostComment[]> {
  return apiFetch<PostComment[]>(`/posts/${postId}/comments`);
}

export async function addComment(postId: string, content: string, parentCommentId?: string, anonymous = false): Promise<PostComment> {
  return apiFetch<PostComment>(`/posts/${postId}/comments`, { method: "POST", body: { content, parentCommentId, anonymous } });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await apiFetch<void>(`/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
}

/** Discuss votes: 1 = up, -1 = down, 0 = clear. */
export async function votePost(postId: string, value: 1 | -1 | 0): Promise<void> {
  await apiFetch<void>(`/posts/${postId}/vote`, { method: "PUT", body: { value } });
}

export async function reactToPost(postId: string): Promise<void> {
  await apiFetch<void>(`/posts/${postId}/react`, { method: "POST" });
}

export async function unreactToPost(postId: string): Promise<void> {
  await apiFetch<void>(`/posts/${postId}/react`, { method: "DELETE" });
}

// §4 safety-audit fix: "report ... everywhere" - posts are now directly reportable, not just
// via a Room (which UPDATE posts and not-yet-joined ACTIVITY/ASK posts never had). Mock mode
// has no moderation backend to write to - same "confirms to the user, nothing durable to
// persist locally" scope as reportRoom in rooms.ts.
export async function reportPost(postId: string, reason: string): Promise<void> {
  await apiFetch<void>(`/posts/${postId}/report`, { method: "POST", body: { reason } });
}
