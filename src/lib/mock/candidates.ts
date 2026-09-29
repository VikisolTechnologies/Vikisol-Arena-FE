import type { CandidateProfile } from "@/lib/types";
import { PEOPLE, toCandidate } from "@/lib/fixtures/world";

// The preview world's 13 neighbours (src/lib/fixtures/world.ts) — one source of truth, so a
// candidate's title, skills and applications always agree with who they are.
export const MOCK_CANDIDATES: CandidateProfile[] = PEOPLE.map(toCandidate);

export const CURRENT_CANDIDATE_ID = "cand-1";

export function getCandidateById(id: string) {
  return MOCK_CANDIDATES.find((c) => c.id === id);
}
