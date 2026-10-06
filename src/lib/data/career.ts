import type { OpenTo } from "@/lib/types";
import type { SkillEntry, Values } from "@/lib/intake/types";

/** Board "Open the career layer" + ARENA-APP-FLOW §6. The intake answers live in the "career"
 *  intake draft; this file holds the intent/visibility choice and the mapping to the real API. */
export type CareerIntent = "find" | "quiet" | "offer";

export interface CareerMeta {
  intent: CareerIntent | null;
  openToWork: boolean;
}
export const EMPTY_META: CareerMeta = { intent: null, openToWork: false };

const KEY = "arena_career_meta";
export function readCareerMeta(): CareerMeta | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_META, ...(JSON.parse(raw) as Partial<CareerMeta>) } : null;
  } catch {
    return null;
  }
}
export function writeCareerMeta(m: CareerMeta) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage blocked */
  }
}

/** What each intent means for the real `openTo` field. */
export function openToFor(intent: CareerIntent | null): OpenTo[] {
  if (intent === "offer") return ["contract", "projects"];
  return ["full-time"];
}

/** Answers Arena BE can store today (FE-API-GAPS #19 lists the rest, with visibility).
 *  currentCtc/expectedCtc round-trip through `PUT /profile/me/details` (confirmed against
 *  `UpdateProfileDetailsRequest`) - storing them is what lets the Apply sheet's "Include my CTC"
 *  toggle (JobDetailScreen.tsx's `hasCtc`) ever appear; without this it could never render for
 *  any real candidate, since it only reads `profile.currentCtc`/`expectedCtc` from the backend. */
export function apiFieldsFrom(v: Values) {
  const skills = ((v.skills as SkillEntry[] | undefined) ?? []).map((s) => s.name);
  const currentCtc = (v.currentCtc as { min?: number } | undefined)?.min;
  const expectedCtc = (v.expected as { min?: number } | undefined)?.min;
  return {
    title: String(v.title ?? "").trim(),
    experienceYears: Number(v.years ?? 0),
    skills,
    preferredLocation: ((v.locations as string[] | undefined) ?? []).join(", ") || undefined,
    resume: typeof File !== "undefined" && v.resume instanceof File ? v.resume : null,
    currentCtc,
    expectedCtc,
  };
}

/** Answers that stay on this device until the backend has per-field visibility. */
export const DEVICE_ONLY_FIELDS = ["Current company", "Status and notice period", "Skill proficiency and years", "Compensation", "Work mode, shift, company size", "Links, education, languages"];

/** Two-letter monogram for a company — correction #3: never a real logo. */
export function monogram(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
