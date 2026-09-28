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
