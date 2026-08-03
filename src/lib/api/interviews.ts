import type { Interview, InterviewFeedback, InterviewSlotOption } from "@/lib/types";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

export interface HiringManagerInterview extends Interview {
  candidateName: string;
  candidateEmoji: string;
  jobTitle: string;
  companyName: string;
}

const KEY = "arena_interviews";

function readAll(): Interview[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(interviews: Interview[]) {
  localStorage.setItem(KEY, JSON.stringify(interviews));
}

function threeSlotsFromNow(): InterviewSlotOption[] {
  return [1, 2, 3].map((days, i) => ({
    id: `slot-${i}`,
    start: new Date(Date.now() + days * 24 * 3600 * 1000 + 14 * 3600 * 1000).toISOString(),
    durationMinutes: 45,
  }));
}

export async function getInterview(id: string): Promise<Interview | null> {
  if (isRealMode()) return apiFetch<Interview | null>(`/interviews/${id}`).catch(() => null);
  return delay(readAll().find((i) => i.id === id) ?? null, 150);
}

export async function getInterviewForApplication(applicationId: string): Promise<Interview | null> {
  if (isRealMode()) {
    return apiFetch<Interview | null>(`/interviews/by-application/${applicationId}`);
  }
  return delay(readAll().find((i) => i.applicationId === applicationId) ?? null, 150);
}

/** Agent "proposes" 3 slots — creates the interview record if one doesn't already exist. */
export async function proposeInterview(applicationId: string): Promise<Interview> {
  if (isRealMode()) {
    return apiFetch<Interview>(`/interviews/propose/${applicationId}`, { method: "POST" });
  }
  const all = readAll();
  const existing = all.find((i) => i.applicationId === applicationId);
  if (existing) return delay(existing, 200);
  const interview: Interview = {
    id: `iv-${Date.now()}`,
    applicationId,
    proposedSlots: threeSlotsFromNow(),
    status: "proposed",
  };
  writeAll([...all, interview]);
  return delay(interview, 500);
}

export async function confirmInterviewSlot(interviewId: string, slotId: string): Promise<Interview | null> {
  if (isRealMode()) {
    return apiFetch<Interview>(`/interviews/${interviewId}/confirm`, { method: "PUT", body: { slotId } });
  }
  const all = readAll();
  const idx = all.findIndex((i) => i.id === interviewId);
  if (idx === -1) return delay(null, 100);
  all[idx] = {
    ...all[idx],
    confirmedSlotId: slotId,
    status: "confirmed",
    meetingLink: all[idx].meetingLink ?? `https://meet.arena.dev/${all[idx].id}`,
  };
  writeAll(all);
  return delay(all[idx], 400);
}

export async function saveInterviewNotes(interviewId: string, notes: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>(`/interviews/${interviewId}/notes`, { method: "PUT", body: { notes } });
    return;
  }
  const all = readAll();
  const idx = all.findIndex((i) => i.id === interviewId);
  if (idx === -1) return delay(undefined, 100);
  all[idx] = { ...all[idx], notes };
  writeAll(all);
  return delay(undefined, 150);
}

/** Submits structured post-interview feedback. Mock mode folds the recommendation straight
 * into the shared applications store (advance/hold/reject); real mode's backend does the same
 * server-side, in the same transaction as marking the interview completed. */
export async function submitInterviewFeedback(
  interviewId: string,
  feedback: Omit<InterviewFeedback, "submittedAt">,
): Promise<Interview | null> {
  if (isRealMode()) {
    return apiFetch<Interview>(`/interviews/${interviewId}/feedback`, { method: "POST", body: feedback });
  }
  const all = readAll();
  const idx = all.findIndex((i) => i.id === interviewId);
  if (idx === -1) return delay(null, 100);
  const full: InterviewFeedback = { ...feedback, submittedAt: new Date().toISOString() };
  all[idx] = { ...all[idx], status: "completed", feedback: full };
  writeAll(all);

  const apps = readApplications();
  const appIdx = apps.findIndex((a) => a.id === all[idx].applicationId);
  if (appIdx !== -1) {
    const nextStage =
      feedback.recommendation === "advance" ? "offer" : feedback.recommendation === "reject" ? "rejected" : "interview";
    apps[appIdx] = { ...apps[appIdx], stage: nextStage, updatedAt: new Date().toISOString() };
    writeApplications(apps);
  }

  return delay(all[idx], 300);
}

// ---- Hiring Manager lite (HM1-HM3) ----

/** HM1: "My interviews" - only ones assigned to the caller. Mock mode has no real multi-user
 * assignment system (single-user constraint, same as elsewhere in this codebase) - it surfaces
 * whatever interviews already exist in the shared mock store, best-effort-denormalized via the
 * existing mock job/application lookups, rather than modeling assignment at all. */
export async function getMyAssignedInterviews(): Promise<HiringManagerInterview[]> {
  if (isRealMode()) return apiFetch<HiringManagerInterview[]>("/interviews/mine");
  const apps = readApplications();
  const { getJobById } = await import("@/lib/mock/jobs");
  const interviews = readAll();
  return delay(
    interviews.map((iv) => {
      const app = apps.find((a) => a.id === iv.applicationId);
      const job = app?.jobId ? getJobById(app.jobId) : undefined;
      return {
        ...iv,
        candidateName: "Candidate",
        candidateEmoji: "🙂",
        jobTitle: job?.title ?? "Role",
        companyName: job?.company ?? "Company",
      };
    }),
    200,
  );
}

export async function getMyAssignedInterview(id: string): Promise<HiringManagerInterview | null> {
  if (isRealMode()) return apiFetch<HiringManagerInterview>(`/interviews/mine/${id}`).catch(() => null);
  const all = await getMyAssignedInterviews();
  return delay(all.find((iv) => iv.id === id) ?? null, 150);
}

/** HM3: a recruiter/company_admin assigns a hiring manager when scheduling. Mock-only: no-ops,
 * since mock mode's single-user model has nothing real to assign to (see getMyAssignedInterviews
 * above) - the assignment UI itself only ever renders in real mode's team-aware flow. */
export async function assignHiringManager(interviewId: string, hiringManagerUserId: string): Promise<void> {
  if (isRealMode()) {
    await apiFetch(`/interviews/${interviewId}/assign-hiring-manager`, { method: "PUT", body: { hiringManagerUserId } });
  }
}
