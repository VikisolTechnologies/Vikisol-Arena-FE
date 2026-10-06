import type { Interview, InterviewFeedback } from "@/lib/types";
import { apiFetch } from "./httpClient";
import type { PagedResponse } from "./paged";

export interface HiringManagerInterview extends Interview {
  candidateName: string;
  candidateEmoji: string;
  jobTitle: string;
  companyName: string;
}

export async function getInterviewForApplication(applicationId: string): Promise<Interview | null> {
  return apiFetch<Interview | null>(`/interviews/by-application/${applicationId}`);
}

/** Agent "proposes" 3 slots — creates the interview record if one doesn't already exist. */
export async function proposeInterview(applicationId: string): Promise<Interview> {
  return apiFetch<Interview>(`/interviews/propose/${applicationId}`, { method: "POST" });
}

export async function confirmInterviewSlot(interviewId: string, slotId: string): Promise<Interview | null> {
  return apiFetch<Interview>(`/interviews/${interviewId}/confirm`, { method: "PUT", body: { slotId } });
}

export async function saveInterviewNotes(interviewId: string, notes: string): Promise<void> {
  await apiFetch<void>(`/interviews/${interviewId}/notes`, { method: "PUT", body: { notes } });
}

/** Submits structured post-interview feedback. */
export async function submitInterviewFeedback(
  interviewId: string,
  feedback: Omit<InterviewFeedback, "submittedAt">,
): Promise<Interview | null> {
  return apiFetch<Interview>(`/interviews/${interviewId}/feedback`, { method: "POST", body: feedback });
}

// ---- Hiring Manager lite (HM1-HM3) ----

/** HM1: "My interviews" - only ones assigned to the caller. */
export async function getMyAssignedInterviews(): Promise<HiringManagerInterview[]> {
  // /interviews/mine returns a PagedResponse now (was a bare array) - the backend added
  // pagination to fix an unbounded-list N+1 query. size=100 keeps this call site's existing
  // "get everything" contract without needing real pagination UI here yet.
  const page = await apiFetch<PagedResponse<HiringManagerInterview>>("/interviews/mine", { query: { page: 0, size: 100 } });
  return page.content;
}

export async function getMyAssignedInterview(id: string): Promise<HiringManagerInterview | null> {
  return apiFetch<HiringManagerInterview>(`/interviews/mine/${id}`).catch(() => null);
}

/** HM3: a recruiter/company_admin assigns a hiring manager when scheduling. */
export async function assignHiringManager(interviewId: string, hiringManagerUserId: string): Promise<void> {
  await apiFetch(`/interviews/${interviewId}/assign-hiring-manager`, { method: "PUT", body: { hiringManagerUserId } });
}
