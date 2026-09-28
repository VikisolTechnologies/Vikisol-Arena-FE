import type { OpenTo } from "@/lib/types";

/** Board "Open the career layer" — the person's career choices before they publish. Kept on this
 *  device until "Publish career profile" saves the parts Arena BE can store (FE-API-GAPS #19). */
export type CareerIntent = "find" | "quiet" | "offer";
export type WorkMode = "any" | "onsite" | "hybrid" | "remote";

export interface CareerDraft {
  intent: CareerIntent | null;
  role: string;
  skills: string[];
  experience: string;
  workMode: WorkMode;
  locations: string[];
  expectedCtc: string;
  notice: string;
  openToWork: boolean;
}

export const EMPTY_CAREER: CareerDraft = { intent: null, role: "", skills: [], experience: "", workMode: "any", locations: [], expectedCtc: "", notice: "", openToWork: false };

export const EXPERIENCE = [
  { value: "0", label: "Less than 1 year" },
  { value: "2", label: "1–3 years" },
  { value: "4", label: "3–5 years" },
  { value: "6", label: "5–8 years" },
  { value: "10", label: "8+ years" },
] as const;
export const NOTICE = ["Immediately", "15 days", "30 days", "60 days", "90 days"] as const;

/** Closest experience band for a stored number of years. */
export function experienceBand(years: number | undefined): string {
  if (years == null || Number.isNaN(years)) return "";
  if (years < 1) return "0";
  if (years < 3) return "2";
  if (years < 5) return "4";
  if (years < 8) return "6";
  return "10";
}

/** What each intent means for the real `openTo` field. */
export function openToFor(intent: CareerIntent | null): OpenTo[] {
  if (intent === "offer") return ["contract", "projects"];
  return ["full-time"];
}

const KEY = "arena_career_draft";
export function readCareerDraft(): CareerDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY_CAREER, ...(JSON.parse(raw) as Partial<CareerDraft>) } : null;
  } catch {
    return null;
  }
}
export function writeCareerDraft(d: CareerDraft | null) {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked — the flow still works for this visit */
  }
}

/** Two-letter monogram for a company — correction #3: never a real logo. */
export function monogram(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}
