import type { Interview, InterviewFeedback, InterviewSlotOption } from "@/lib/types";
import { readApplications, writeApplications } from "./applicationsStore";
import { delay } from "./shared";

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
  return delay(readAll().find((i) => i.id === id) ?? null, 150);
}

export async function getInterviewForApplication(applicationId: string): Promise<Interview | null> {
  return delay(readAll().find((i) => i.applicationId === applicationId) ?? null, 150);
}

/** Agent "proposes" 3 slots — creates the interview record if one doesn't already exist. */
export async function proposeInterview(applicationId: string): Promise<Interview> {
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
  const all = readAll();
  const idx = all.findIndex((i) => i.id === interviewId);
  if (idx === -1) return delay(undefined, 100);
  all[idx] = { ...all[idx], notes };
  writeAll(all);
  return delay(undefined, 150);
}

/** Submits structured post-interview feedback and folds its recommendation straight into the
 * shared applications store (advance/hold/reject) — the pipeline reflects it immediately,
 * same as HRLMS-BE's own recruitment module does for its internal ATS. */
export async function submitInterviewFeedback(
  interviewId: string,
  feedback: Omit<InterviewFeedback, "submittedAt">,
): Promise<Interview | null> {
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
