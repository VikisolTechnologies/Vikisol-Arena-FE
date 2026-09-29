import type { ApplicationStage, JobPosting } from "@/lib/types";
import { getApplicantsForPosting } from "@/lib/api/enterprise";

/** Flow §8 pipeline columns over the API's real stages. "Hired" has no stage yet (gap #21). */
export const STAGES: { id: ApplicationStage; label: string }[] = [
  { id: "applied", label: "New" },
  { id: "screening", label: "Reviewing" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Not selected" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.id, s.label])) as Record<ApplicationStage, string>;

export type Applicant = Awaited<ReturnType<typeof getApplicantsForPosting>>[number] & { posting: JobPosting };

/** Every applicant across these postings (one call per posting; typically few). A posting whose
 *  applicants fail to load is skipped, never blanks the whole view. */
export async function loadApplicants(postings: JobPosting[]): Promise<Applicant[]> {
  const lists = await Promise.allSettled(postings.map((p) => getApplicantsForPosting(p.id).then((as) => as.map((a) => ({ ...a, posting: p })))));
  return lists.flatMap((r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []));
}

const DAY = 86_400_000;
/** "N candidates waiting more than 3 days" (flow §8 Home tasks). */
export function waitingTooLong(applicants: Applicant[], now = Date.now()) {
  return applicants.filter((a) => (a.stage === "applied" || a.stage === "screening") && now - Date.parse(a.updatedAt ?? a.appliedAt) > 3 * DAY);
}

/** Board colours for the funnel tiles and Kanban column heads (dark surface). */
export const STAGE_TONE: Record<ApplicationStage, string> = {
  applied: "bg-foreground/10 text-foreground",
  screening: "bg-info/15 text-info-on-dark",
  interview: "bg-success/15 text-success-on-dark",
  offer: "bg-primary/15 text-[#8f2c05]",
  rejected: "bg-foreground/8 text-foreground/80",
};

/** Post a job stores must-haves / nice-to-haves / level inside the description (the API has one
 *  text field — gap #28). This reads them back so the job page and evidence can use them. */
export function jobParts(description: string) {
  const blocks = description.split(/\n{2,}/);
  const list = (head: string) => {
    const b = blocks.find((x) => x.startsWith(`${head}:`));
    return b ? b.split("\n").slice(1).map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean) : [];
  };
  const level = blocks.find((x) => x.startsWith("Experience: "))?.slice("Experience: ".length);
  const about = blocks.filter((x) => !/^(Must-haves|Nice-to-haves):|^Experience: /.test(x)).join("\n\n").trim();
  return { about, must: list("Must-haves"), nice: list("Nice-to-haves"), level };
}

export type Evidence = { item: string; state: "shown" | "partial" | "missing"; source?: string };

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2);

/** Must-have evidence from what the person consented to share (skills, title, bio) — never
 *  from inferred traits. "Partial" = some of the must-have's words appear. */
export function evidenceFor(must: string[], c: { skills?: { name: string }[]; title?: string; bio?: string } | null | undefined): Evidence[] {
  const skills = (c?.skills ?? []).map((s) => s.name.toLowerCase());
  const text = `${c?.title ?? ""} ${c?.bio ?? ""}`.toLowerCase();
  return must.map((item) => {
    const lower = item.toLowerCase();
    if (skills.some((s) => s === lower || s.includes(lower))) return { item, state: "shown", source: "skills" };
    if (text.includes(lower)) return { item, state: "shown", source: "profile" };
    const ws = words(item);
    const hit = ws.filter((w) => skills.some((s) => s.includes(w)) || text.includes(w)).length;
    return hit > 0 && ws.length > 0 ? { item, state: "partial", source: skills.some((s) => ws.some((w) => s.includes(w))) ? "skills" : "profile" } : { item, state: "missing" };
  });
}

/* ── Device-only extras, labelled as such in the UI (gaps #28–#30) ── */
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the extra is simply not kept */
  }
}

export type JobExtras = { deadline?: string; questions?: string[] };
export const readJobExtras = (postingId: string) => readJSON<JobExtras>(`arena_job_extras_${postingId}`, {});
export const saveJobExtras = (postingId: string, extras: JobExtras) => writeJSON(`arena_job_extras_${postingId}`, extras);

export type RecruiterNote = { text: string; at: string };
export const readNotes = (applicationId: string) => readJSON<RecruiterNote[]>(`arena_recruiter_notes_${applicationId}`, []);
export function addNote(applicationId: string, text: string): RecruiterNote[] {
  const next = [{ text, at: new Date().toISOString() }, ...readNotes(applicationId)];
  writeJSON(`arena_recruiter_notes_${applicationId}`, next);
  return next;
}

/** The kind, templated "Not selected" message (flow §8 close the loop). Shown to the recruiter
 *  before they confirm; the API can't carry it yet (gap #31) so Arena's own notice is what's sent. */
export const notSelectedMessage = (name: string, job: string, company: string) =>
  `Hi ${name.split(" ")[0]}, thank you for applying for ${job} at ${company}. We've decided to move forward with other candidates this time. We appreciated the time you put in, and we'd be glad to see you apply again.`;
