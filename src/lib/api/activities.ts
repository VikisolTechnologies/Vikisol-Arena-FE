/**
 * M6 area 3b — the `/activities/*` endpoints (ActivitiesController.java), layered on top of the
 * same ACTIVITY posts and join requests `src/lib/api/posts.ts` already handles (approve/decline
 * stay on the generic `/posts/{id}/joins/...` endpoints — ActivitiesController has no
 * activity-specific equivalent; confirmed reading it). Real mode only: mock mode's activity
 * screens keep using the existing mock post/join fixtures (no new mock data work per M6's
 * rules) and simply no-op or return an honest empty where this richer layer would go, since the
 * demo path never had it.
 *
 * Every shape here mirrors `ActivityDtos.java` field-for-field (verified live against the local
 * backend with curl, not just read from source).
 */
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";
import { delay } from "./shared";

export interface ActivityCost {
  type: "free" | "shared";
  perPersonInr?: number;
  note?: string;
}

export interface ActivityQuestion {
  id: string;
  text: string;
  required: boolean;
}

export interface ActivityViewerState {
  host: boolean;
  joinStatus?: string;
  waitlistPosition?: number;
  answered: boolean;
  checkedInAt?: string;
  outcome?: string;
  attendedConfirmed?: boolean;
  disputeStatus?: string;
  disputeOpenUntil?: string;
  reminders: number[];
}

export interface ActivityDetails {
  postId: string;
  category?: string;
  subtype?: string;
  level?: string;
  cost?: ActivityCost;
  typeAnswers: Record<string, unknown>;
  bring: string[];
  accessibility?: string;
  indoor?: boolean;
  minSize?: number;
  waitlist: boolean;
  repeat?: string;
  womenOnly: boolean;
  reach?: string;
  coverUrl?: string;
  needsEmergencyContact: boolean;
  questions: ActivityQuestion[];
  spotsLeft?: number;
  waitlistCount: number;
  viewer?: ActivityViewerState;
}

export interface ActivityAnswer {
  questionId: string;
  question: string;
  answer: string;
}

export interface WaitlistEntry {
  userId: string;
  name: string;
  avatarEmoji: string;
  position: number;
  joinedAt: string;
}

export interface AttendanceRow {
  joinId: string;
  userId: string;
  name: string;
  checkedInAt?: string;
  outcome?: string;
  outcomeRecordedAt?: string;
  joinerAttended?: boolean;
  disputeStatus?: string;
  disputeReason?: string;
}

export interface EmergencyContact {
  userId: string;
  name: string;
  contactName: string;
  contactPhone: string;
}

export interface ActivityFeedback {
  id: string;
  postId: string;
  activity: string;
  fromUserId: string;
  fromName: string;
  joinAgain?: boolean;
  note?: string;
  createdAt: string;
}

export interface UpdateActivityDetailsInput {
  category?: string;
  subtype?: string;
  level?: string;
  cost?: ActivityCost;
  typeAnswers?: Record<string, unknown>;
  bring?: string[];
  accessibility?: string;
  indoor?: boolean;
  minSize?: number;
  waitlist?: boolean;
  repeat?: string;
  womenOnly?: boolean;
  reach?: string;
}

export interface JoinActivityInput {
  answers?: { questionId: string; answer?: string }[];
  note?: string;
  emergencyContact?: { name: string; phone: string };
}

/** GET /activities/kinds — the real category→subtypes catalogue, replacing any hardcoded list
 * in the intake "What kind?" step. Guest-readable. Mock mode falls back to the local taxonomy
 * (`src/lib/activities/taxonomy.ts`) it was already built against. */
export async function getActivityKinds(): Promise<Record<string, string[]> | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<Record<string, string[]>>("/activities/kinds", { auth: false });
}

/** GET /activities/{id} — the activity-specific layer on top of the generic post (questions,
 * type answers, cover, spots/waitlist counts, the viewer's own join/attendance state). Guest-
 * readable; `undefined` in mock mode (the mock post already carries everything those screens
 * use). */
export async function getActivity(postId: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}`, { auth: false });
}

export async function updateActivityDetails(postId: string, input: UpdateActivityDetailsInput): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/details`, { method: "PUT", body: input });
}

export async function uploadActivityCover(postId: string, file: File): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ActivityDetails>(`/activities/${postId}/cover`, { method: "POST", formData });
}

export async function deleteActivityCover(postId: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/cover`, { method: "DELETE" });
}

export async function setActivityQuestions(postId: string, questions: { text: string; required?: boolean }[]): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/questions`, { method: "PUT", body: { questions } });
}

/** POST /activities/{id}/join — the activity-aware join, with answers to the host's questions
 * and (treks) an emergency contact. Mock mode falls back to `requestJoin` in posts.ts, which the
 * existing screens already call for the simple case. */
export async function joinActivity(postId: string, input: JoinActivityInput): Promise<{ id: string; status: string } | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<{ id: string; status: string }>(`/activities/${postId}/join`, { method: "POST", body: input });
}

/** GET /activities/{id}/answers/{userId} — host-only reading of one joiner's answers. */
export async function getJoinerAnswers(postId: string, userId: string): Promise<ActivityAnswer[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<ActivityAnswer[]>(`/activities/${postId}/answers/${userId}`);
}

export async function joinWaitlist(postId: string, input?: JoinActivityInput): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/waitlist`, { method: "POST", body: input });
}

export async function leaveWaitlist(postId: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/waitlist`, { method: "DELETE" });
}

export async function getWaitlist(postId: string): Promise<WaitlistEntry[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<WaitlistEntry[]>(`/activities/${postId}/waitlist`);
}

/** POST /activities/{id}/check-in — the joiner's own "I'm here", day-of. */
export async function checkInSelf(postId: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/check-in`, { method: "POST" });
}

export async function getAttendance(postId: string): Promise<AttendanceRow[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<AttendanceRow[]>(`/activities/${postId}/attendance`);
}

/** PUT /activities/{id}/attendance/{joinId}/check-in — the host marking who came. Replaces the
 * generic `recordJoinOutcome` outcome field for ACTIVITY posts specifically; that generic field
 * stays the mechanism for NEED/OFFER/PROJECT posts, which have no attendance-dispute concept. */
export async function hostCheckIn(postId: string, joinId: string): Promise<AttendanceRow[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<AttendanceRow[]>(`/activities/${postId}/attendance/${joinId}/check-in`, { method: "PUT" });
}

/** POST /activities/{id}/attendance/confirm — Flow §3 A13: the joiner confirms they came, or
 * disputes the host's "didn't show" within the 72h window (`dispute` required in that case). */
export async function confirmAttendance(postId: string, attended: boolean, dispute?: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/attendance/confirm`, { method: "POST", body: { attended, dispute } });
}

export async function disputeAttendance(postId: string, reason: string): Promise<ActivityDetails | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityDetails>(`/activities/${postId}/attendance/dispute`, { method: "POST", body: { reason } });
}

export async function acceptDispute(postId: string, joinId: string): Promise<AttendanceRow[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<AttendanceRow[]>(`/activities/${postId}/attendance/${joinId}/accept-dispute`, { method: "PUT" });
}

/** POST /activities/{id}/feedback — private, never a public star rating (Flow §3 A14).
 * `toUserId` defaults to the host on the backend when omitted (a joiner's feedback); a host
 * names the joiner explicitly. */
export async function giveActivityFeedback(postId: string, input: { toUserId?: string; joinAgain: boolean; note?: string }): Promise<ActivityFeedback | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ActivityFeedback>(`/activities/${postId}/feedback`, { method: "POST", body: input });
}

export async function getReceivedFeedback(page = 0, size = 100): Promise<ActivityFeedback[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<ActivityFeedback[]>("/activities/feedback/received", { query: { page, size } });
}

/** GET /activities/{id}/emergency-contacts — host-only, treks only. */
export async function getEmergencyContacts(postId: string): Promise<EmergencyContact[]> {
  if (!isRealMode()) return delay([], 150);
  return apiFetch<EmergencyContact[]>(`/activities/${postId}/emergency-contacts`);
}
