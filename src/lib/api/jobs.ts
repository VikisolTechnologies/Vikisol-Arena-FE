import type { Job } from "@/lib/types";
import { MOCK_JOBS, getJobById } from "@/lib/mock/jobs";
import { delay } from "./shared";

export async function getJobs(): Promise<Job[]> {
  return delay(MOCK_JOBS, 300);
}

export async function getJob(id: string): Promise<Job | undefined> {
  return delay(getJobById(id), 250);
}

const PASSED_KEY = "arena_passed_jobs";

export function getPassedJobIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PASSED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function passOnJob(jobId: string) {
  const passed = getPassedJobIds();
  if (!passed.includes(jobId)) localStorage.setItem(PASSED_KEY, JSON.stringify([...passed, jobId]));
}
