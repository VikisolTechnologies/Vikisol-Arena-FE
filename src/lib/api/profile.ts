import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getOnboardingProfile, saveOnboardingProfile } from "@/lib/session";
import type { AutonomyLevel, CandidateProfile, ConsentSettings, Industry, LocationConsent, OpenTo } from "@/lib/types";
import { jitterCoord } from "@/lib/geo";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

interface CandidateProfileResponse {
  id: string;
  name: string;
  avatarEmoji: string;
  title: string;
  industry: string;
  location: string;
  remote: boolean;
  skills: { name: string; verified?: boolean }[];
  experienceYears: number;
  rateFloor: number;
  openTo: string[];
  careerHealth: number;
  consent: ConsentSettings;
  autonomy: string;
  bio?: string;
  cvUrl?: string;
  cvFileName?: string;
  locationConsent?: string;
  homeCity?: string;
  approxLat?: number;
  approxLng?: number;
}

function toCandidateProfile(res: CandidateProfileResponse): CandidateProfile {
  return {
    id: res.id,
    name: res.name,
    avatarEmoji: res.avatarEmoji,
    title: res.title,
    industry: res.industry as Industry,
    location: res.location,
    remote: res.remote,
    skills: res.skills,
    experienceYears: res.experienceYears,
    rateFloor: res.rateFloor,
    openTo: res.openTo as OpenTo[],
    careerHealth: res.careerHealth,
    consent: res.consent,
    autonomy: res.autonomy.toLowerCase() as AutonomyLevel,
    bio: res.bio,
    cvUrl: res.cvUrl,
    resumeFileName: res.cvFileName,
    locationConsent: res.locationConsent as LocationConsent | undefined,
    homeCity: res.homeCity,
    approxLat: res.approxLat,
    approxLng: res.approxLng,
  };
}

// Mock-mode-only overlay for §5's location consent, kept separate from OnboardingProfile since
// it's a Phase B addition orthogonal to onboarding - same small-dedicated-key pattern as
// verification.ts's own mock state.
const LOCATION_KEY = "arena_location_consent";
interface MockLocationState {
  locationConsent: LocationConsent;
  homeCity?: string;
  approxLat?: number;
  approxLng?: number;
}
function readMockLocation(): MockLocationState {
  if (typeof window === "undefined") return { locationConsent: "off" };
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as MockLocationState) : { locationConsent: "off" };
  } catch {
    return { locationConsent: "off" };
  }
}
function writeMockLocation(state: MockLocationState) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(state));
}

/** Merges the static seed candidate with whatever the user entered during onboarding. */
export async function getMyProfile(): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me").then(toCandidateProfile);
  }
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
        careerHealth: onboarding.careerHealth ?? base.careerHealth,
      }
    : base;
  const location = readMockLocation();
  return delay({ ...merged, ...location }, 300);
}

async function patchOnboardingProfile(
  patch: Partial<{
    skills: string[];
    consent: ConsentSettings;
    autonomy: AutonomyLevel;
    resumeFileName: string;
    resumeUploadedAt: string;
    careerHealth: number;
  }>,
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
    careerHealth: patch.careerHealth ?? onboarding?.careerHealth ?? current.careerHealth,
  });
  return getMyProfile();
}

/** Real mode only: syncs the onboarding wizard's name/title/industry/experience/rate/openTo to
 * arena-api. Mock mode's onboarding page already writes this straight to localStorage via
 * saveOnboardingProfile(), so this is a no-op there. */
export async function updateMyProfileDetails(details: {
  name: string;
  title: string;
  industry: Industry;
  experienceYears: number;
  rateFloor: number;
  openTo: OpenTo[];
}): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/details", { method: "PUT", body: details }).then(toCandidateProfile);
  }
  return getMyProfile();
}

export async function updateMySkills(skills: string[]): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/skills", { method: "PUT", body: { skills } }).then(toCandidateProfile);
  }
  return patchOnboardingProfile({ skills });
}

export async function updateMyConsent(consent: ConsentSettings): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/consent", { method: "PUT", body: consent }).then(toCandidateProfile);
  }
  return patchOnboardingProfile({ consent });
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md §5 (Phase B). "precise" sends a real one-shot browser
// Geolocation reading (its own explicit permission prompt, independent of any other consent),
// "city" sends a manually-typed city name only, "off" sends neither - the caller (Settings page)
// is responsible for gathering lat/lng via navigator.geolocation before calling this with
// consent="precise".
export async function updateMyLocation(input: { consent: LocationConsent; lat?: number; lng?: number; city?: string }): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/location", { method: "PUT", body: input }).then(toCandidateProfile);
  }
  if (input.consent === "off") {
    writeMockLocation({ locationConsent: "off" });
  } else if (input.consent === "city") {
    writeMockLocation({ locationConsent: "city", homeCity: input.city });
  } else {
    const approx = input.lat != null && input.lng != null ? jitterCoord(input.lat, input.lng) : undefined;
    writeMockLocation({ locationConsent: "precise", approxLat: approx?.lat, approxLng: approx?.lng });
  }
  return getMyProfile();
}

export async function updateMyAutonomy(autonomy: AutonomyLevel): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/autonomy", { method: "PUT", body: { autonomy } }).then(toCandidateProfile);
  }
  return patchOnboardingProfile({ autonomy });
}

/** Records a resume upload + whatever structured fields the (simulated, mock-only) parse
 * confirmed. Real mode actually uploads the file; mock mode only ever needed its name. */
export async function updateMyResume(input: { file: File; skills?: string[] }): Promise<CandidateProfile> {
  if (isRealMode()) {
    const formData = new FormData();
    formData.append("file", input.file);
    return apiFetch<CandidateProfileResponse>("/profile/me/cv", { method: "POST", formData }).then(toCandidateProfile);
  }
  return patchOnboardingProfile({
    resumeFileName: input.file.name,
    resumeUploadedAt: new Date().toISOString(),
    skills: input.skills,
  });
}

/** Small, capped nudge to Career Health when verified work completes — a won bid, an accepted
 * milestone. Mock-only: real mode's careerHealth is computed server-side from actual activity. */
export async function bumpMyCareerHealth(delta: number): Promise<CandidateProfile> {
  if (isRealMode()) return getMyProfile();
  const current = await getMyProfile();
  return patchOnboardingProfile({ careerHealth: Math.max(0, Math.min(100, current.careerHealth + delta)) });
}

// ---- DPDP self-service data rights (ARENA-SHIP-IT.md #5) ----

export interface DataExport {
  email: string;
  profile: CandidateProfile;
  applications: { jobTitle: string | null; stage: string; appliedAt: string }[];
  exportedAt: string;
}

/** Downloads everything arena-api holds on this candidate as one JSON object - mock mode has
 * no server-side record to export, so it reconstructs the same shape from local state instead
 * of pretending the button does nothing. */
export async function exportMyData(): Promise<DataExport> {
  if (isRealMode()) return apiFetch<DataExport>("/profile/me/export");
  const profile = await getMyProfile();
  return { email: "you@example.com", profile, applications: [], exportedAt: new Date().toISOString() };
}

/** Right-to-erasure. Real mode calls the backend (anonymizes the profile, disables the
 * account, revokes every session - see CandidateProfileService.deleteMyAccount) and the caller
 * is responsible for clearing the local session/token afterward. Mock mode just clears local
 * state directly since there's no server record to erase. */
export async function deleteMyAccount(): Promise<void> {
  if (isRealMode()) {
    await apiFetch<void>("/profile/me", { method: "DELETE" });
    return;
  }
  return delay(undefined, 300);
}
