import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getOnboardingProfile } from "@/lib/session";
import type { CandidateProfile } from "@/lib/types";
import { delay } from "./shared";

/** Merges the static seed candidate with whatever the user entered during onboarding. */
export async function getMyProfile(): Promise<CandidateProfile> {
  const base = getCandidateById(CURRENT_CANDIDATE_ID)!;
  const onboarding = getOnboardingProfile();
  const merged: CandidateProfile = onboarding
    ? {
        ...base,
        name: onboarding.name || base.name,
        title: onboarding.title || base.title,
        industry: onboarding.industry,
        skills: onboarding.skills.length
          ? onboarding.skills.map((name) => ({ name, verified: false }))
          : base.skills,
        experienceYears: onboarding.experienceYears,
        rateFloor: onboarding.rateFloor,
        openTo: onboarding.openTo.length ? onboarding.openTo : base.openTo,
        consent: onboarding.consent,
      }
    : base;
  return delay(merged, 300);
}
