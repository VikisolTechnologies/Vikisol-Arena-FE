import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getOnboardingProfile, saveOnboardingProfile } from "@/lib/session";
import type { AutonomyLevel, CandidateProfile, ConsentSettings } from "@/lib/types";
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
        autonomy: onboarding.autonomy ?? base.autonomy,
        resumeFileName: onboarding.resumeFileName,
        resumeUploadedAt: onboarding.resumeUploadedAt,
      }
    : base;
  return delay(merged, 300);
}

async function patchOnboardingProfile(
  patch: Partial<{ skills: string[]; consent: ConsentSettings; autonomy: AutonomyLevel; resumeFileName: string; resumeUploadedAt: string }>,
) {
  const current = await getMyProfile();
  const onboarding = getOnboardingProfile();
  saveOnboardingProfile({
    name: onboarding?.name ?? current.name,
    title: onboarding?.title ?? current.title,
    industry: onboarding?.industry ?? current.industry,
    skills: patch.skills ?? onboarding?.skills ?? current.skills.map((s) => s.name),
    experienceYears: onboarding?.experienceYears ?? current.experienceYears,
    rateFloor: onboarding?.rateFloor ?? current.rateFloor,
    openTo: onboarding?.openTo ?? current.openTo,
    consent: patch.consent ?? onboarding?.consent ?? current.consent,
    autonomy: patch.autonomy ?? onboarding?.autonomy ?? current.autonomy,
    resumeFileName: patch.resumeFileName ?? onboarding?.resumeFileName ?? current.resumeFileName,
    resumeUploadedAt: patch.resumeUploadedAt ?? onboarding?.resumeUploadedAt ?? current.resumeUploadedAt,
  });
  return getMyProfile();
}

/** Persists edited skills back into the same onboarding-profile store getMyProfile reads from. */
export async function updateMySkills(skills: string[]): Promise<CandidateProfile> {
  return patchOnboardingProfile({ skills });
}

export async function updateMyConsent(consent: ConsentSettings): Promise<CandidateProfile> {
  return patchOnboardingProfile({ consent });
}

export async function updateMyAutonomy(autonomy: AutonomyLevel): Promise<CandidateProfile> {
  return patchOnboardingProfile({ autonomy });
}

/** Records a resume upload + whatever structured fields the (simulated) parse confirmed. */
export async function updateMyResume(input: { fileName: string; skills?: string[] }): Promise<CandidateProfile> {
  return patchOnboardingProfile({
    resumeFileName: input.fileName,
    resumeUploadedAt: new Date().toISOString(),
    skills: input.skills,
  });
}
