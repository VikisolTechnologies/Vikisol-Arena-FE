import type { CandidateProfile } from "@/lib/types";
import {
  rand,
  pick,
  pickN,
  intBetween,
  fullName,
  LOCATIONS,
  SKILLS_BY_INDUSTRY,
  INDUSTRIES,
  TITLES_BY_INDUSTRY,
  AVATAR_EMOJIS,
} from "./seed";

function buildCandidate(id: string): CandidateProfile {
  const industry = pick(INDUSTRIES);
  const experienceYears = intBetween(0, 14);
  const openToPool = ["full-time", "contract", "projects"] as const;
  return {
    id,
    name: fullName(),
    avatarEmoji: pick(AVATAR_EMOJIS),
    title: pick(TITLES_BY_INDUSTRY[industry]),
    industry,
    location: pick(LOCATIONS),
    remote: rand() < 0.4,
    skills: pickN(SKILLS_BY_INDUSTRY[industry], intBetween(3, 6)).map((name) => ({
      name,
      verified: rand() < 0.5,
    })),
    experienceYears,
    rateFloor: intBetween(6, 42),
    openTo: pickN(openToPool, intBetween(1, 3)),
    careerHealth: intBetween(45, 96),
    consent: { autoApply: rand() < 0.7, searchableByEnterprises: rand() < 0.8 },
    autonomy: pick(["manual", "supervised", "autopilot"] as const),
    bio: `${experienceYears}+ years in ${industry.toLowerCase()}, based in ${pick(LOCATIONS)}.`,
  };
}

export const MOCK_CANDIDATES: CandidateProfile[] = Array.from({ length: 40 }, (_, i) =>
  buildCandidate(`cand-${i + 1}`),
);

export const CURRENT_CANDIDATE_ID = "cand-1";

export function getCandidateById(id: string) {
  return MOCK_CANDIDATES.find((c) => c.id === id);
}
