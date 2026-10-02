/**
 * MARATHON-FE Step 2 (area 4) — the `/needs/*` endpoints (NeedController.java), layered on top
 * of ASK/OFFER posts the same way `src/lib/api/activities.ts` layers on ACTIVITY posts. Approve/
 * decline for activities stayed on the generic `/posts/{id}/joins/...` endpoints because
 * ActivitiesController has no equivalent — needs are different: `accept`/`decline` here ARE the
 * real, only mechanism for a need/offer response, there is no generic-posts equivalent at all.
 * Real mode only; mock mode keeps using the existing mock post data this screen was built
 * against (no new fixture work per M6's rules).
 */
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { delay } from "./shared";

export interface NeedOffer {
  days: string[];
  limit?: string;
  proofUrl?: string;
  limitReached: boolean;
}

export interface NeedResponseCompletion {
  ownerConfirmedAt?: string;
  responderConfirmedAt?: string;
  ownerNote?: string;
  responderNote?: string;
  completedAt?: string;
}

export interface NeedResponse {
  id: string;
  postId: string;
  userId: string;
  name: string;
  avatarEmoji: string;
  message: string;
  status: string;
  createdAt: string;
  conversationId?: string;
  completion?: NeedResponseCompletion;
}

export interface NeedViewer {
  owner: boolean;
  myResponse?: NeedResponse;
}

export interface NeedView {
  postId: string;
  kind: string;
  category?: string;
  preferredTime?: string;
  status: string;
  responseCount: number;
  viewer?: NeedViewer;
  urgency?: string;
  helpType?: string;
  answers: Record<string, unknown>;
  offer?: NeedOffer;
}

export interface NeedOutcome {
  postId: string;
  kind: string;
  category?: string;
  role: string;
  completedAt: string;
  title: string;
}

export interface MyNeedResponse {
  postId: string;
  postTitle: string;
  kind: string;
  response: NeedResponse;
}

export interface NeedDetailsInput {
  category: string;
  preferredTime?: string;
  urgency?: string;
  helpType?: string;
  answers?: Record<string, unknown>;
  days?: string[];
  limit?: string;
  proofUrl?: string;
}

/** GET /needs/categories — guest-readable, real list of need/offer categories. */
export async function getNeedCategories(): Promise<string[] | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<string[]>("/needs/categories", { auth: false });
}

export async function getNeed(postId: string): Promise<NeedView | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedView>(`/needs/${postId}`, { auth: false });
}

export async function setNeedDetails(postId: string, input: NeedDetailsInput): Promise<NeedView | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedView>(`/needs/${postId}/details`, { method: "PUT", body: input });
}

export async function respondToNeed(postId: string, message: string): Promise<NeedResponse | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedResponse>(`/needs/${postId}/responses`, { method: "POST", body: { message } });
}

export async function getNeedResponses(postId: string): Promise<NeedResponse[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<NeedResponse[]>(`/needs/${postId}/responses`);
}

export async function withdrawNeedResponse(postId: string): Promise<NeedResponse | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedResponse>(`/needs/${postId}/responses/me`, { method: "DELETE" });
}

export async function acceptNeedResponse(postId: string, responseId: string): Promise<NeedResponse | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedResponse>(`/needs/${postId}/responses/${responseId}/accept`, { method: "PUT" });
}

export async function declineNeedResponse(postId: string, responseId: string): Promise<NeedResponse | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedResponse>(`/needs/${postId}/responses/${responseId}/decline`, { method: "PUT" });
}

/** Either side confirms the outcome; once both have, it's complete (Flow §4). */
export async function confirmNeedResponse(postId: string, responseId: string, note?: string): Promise<NeedResponse | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<NeedResponse>(`/needs/${postId}/responses/${responseId}/confirm`, { method: "POST", body: note ? { note } : undefined });
}

export async function getMyNeedResponses(page = 0, size = 100): Promise<MyNeedResponse[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<MyNeedResponse[]>("/needs/responses/mine", { query: { page, size } });
}

/** GET /needs/outcomes/{userId} — guest-readable, a person's public outcome history (never with
 * whom). Used on the public profile's "outcomes" section. */
export async function getNeedOutcomes(userId: string, page = 0, size = 100): Promise<NeedOutcome[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<NeedOutcome[]>(`/needs/outcomes/${userId}`, { query: { page, size }, auth: false });
}
