/**
 * The job-search journey's view of the career intake (VNext "Jenny automates the outcome"). Jenny's
 * "draft" is the person's existing profile plus the career answers already on this device — the
 * same `career` intake draft the Career setup form writes, so both stay in step.
 */
import { CAREER_SCHEMA } from "@/lib/intake/schemas/career";
import { isEmpty, summarize, type Field, type MoneyRange, type Values } from "@/lib/intake/types";
import { evidenceFor, jobParts } from "@/lib/data/business";
import type { CandidateProfile, Job } from "@/lib/types";

const KEY = "arena_intake_career";

export function careerField(id: string): Field {
  const f = CAREER_SCHEMA.steps.flatMap((s) => s.fields).find((x) => x.id === id);
  if (!f) throw new Error(`No career field "${id}"`);
  return f;
}

/** Profile first, then whatever the person already answered on this device. */
export function careerValues(profile: CandidateProfile): Values {
  let saved: Values = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Values;
  } catch {
    /* storage blocked */
  }
  return {
    title: profile.title || undefined,
    years: profile.experienceYears || 0,
    skills: profile.skills.map((s) => ({ name: s.name, level: "working", years: 1 })),
    locations: (profile.preferredLocation ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    roles: profile.title ? [profile.title] : undefined,
    ...saved,
  };
}

export function saveCareerAnswer(id: string, value: unknown) {
  try {
    const cur = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Values;
    localStorage.setItem(KEY, JSON.stringify({ ...cur, [id]: value }));
  } catch {
    /* storage blocked */
  }
}

/** "I'm looking for a product design job, but keep it private" → "product design". */
export function rolePhrase(text: string, profile?: CandidateProfile | null) {
  const m = text.match(/(?:looking for|want|find|need)\s+(?:a|an|some)?\s*(?:new\s+)?(.+?)\s+(?:job|role|position|work|opportunit)/i);
  return (m?.[1] ?? profile?.title ?? "new").trim().toLowerCase();
}

/** The four details the board asks for when they're missing. */
export const MISSING = [
  { id: "years", title: "Total experience", hint: "Add years" },
  { id: "modes", title: "Work mode", hint: "Remote, hybrid or on-site?" },
  { id: "expected", title: "Compensation", hint: "Expected range" },
  { id: "notice", title: "Notice period", hint: "Select notice period" },
] as const;

export function answer(v: Values, id: string) {
  if (id === "years") return v.years ? `${v.years} years` : "";
  if (id === "expected") {
    const r = v.expected as MoneyRange | undefined;
    return r && (r.min != null || r.max != null) ? `₹${[r.min, r.max].filter((x) => x != null).join("–")} LPA` : "";
  }
  if (id === "notice" && !isEmpty(v.notice)) return String(v.notice);
  return isEmpty(v[id]) ? "" : summarize(careerField(id), v[id]);
}

/** Evidence against a job's must-haves (counts only — correction #4), plus two plain reasons. */
export function jobEvidence(job: Job, profile: CandidateProfile) {
  const parts = jobParts(job.description);
  const must = parts.must.length ? parts.must : job.skills;
  const ev = evidenceFor(must, profile);
  const shown = ev.filter((e) => e.state === "shown");
  const reasons = [
    shown.length ? `Uses ${shown.slice(0, 2).map((e) => e.item).join(" and ")} — on your profile` : null,
    profile.title && job.title.toLowerCase().includes(profile.title.toLowerCase().split(" ").pop() ?? "") ? `Similar role to your recent experience as ${profile.title}` : null,
    job.remote ? "Remote-friendly" : `${job.location.split(",")[0]}, near you`,
  ].filter((x): x is string => !!x);
  return { matches: shown.length, questions: ev.filter((e) => e.state === "partial").length, missing: ev.filter((e) => e.state === "missing").length, reasons: reasons.slice(0, 2), must };
}
