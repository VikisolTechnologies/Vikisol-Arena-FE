import type { Application } from "@/lib/types";

// The one true applications store — shared by applications.ts (candidate views: "my"
// applications, filtered by candidateId) and enterprise.ts (enterprise views: a posting's
// pipeline, filtered by postingId). Previously these were two separate localStorage-backed
// collections (Application vs. Applicant) that could drift out of sync; see AUDIT.md.
const KEY = "arena_applications";

export function readApplications(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
  }
}

export function writeApplications(apps: Application[]) {
  localStorage.setItem(KEY, JSON.stringify(apps));
}
