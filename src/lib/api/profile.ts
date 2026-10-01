import { CURRENT_CANDIDATE_ID, getCandidateById } from "@/lib/mock/candidates";
import { getOnboardingProfile, saveOnboardingProfile } from "@/lib/session";
import type { AutonomyLevel, CandidateProfile, ConsentSettings, Industry, LocationConsent, OpenTo, PublicCandidateProfile } from "@/lib/types";
import { jitterCoord } from "@/lib/geo";
import { getCounts } from "./follows";
import { delay } from "./shared";
import { isRealMode } from "./mode";
import { ApiError, apiFetch } from "./httpClient";

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
  cameForJob?: boolean;
  organization?: string;
  currentCtc?: number;
  expectedCtc?: number;
  preferredLocation?: string;
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
    cameForJob: res.cameForJob,
    organization: res.organization,
    currentCtc: res.currentCtc,
    expectedCtc: res.expectedCtc,
    preferredLocation: res.preferredLocation,
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

// PERF-REPORT.md Pass 3's own follow-up: "per-route data fetch" was diagnosed as part of the
// 2-2.6s click-to-render cost on in-app navigation, but the profile fetch specifically is worse
// than a generic per-route fetch — AppShell's `profile` prop means every one of the 23 routes
// that render it calls getMyProfile() fresh on mount, so navigating Home -> Discover -> Map
// re-fetches the exact same, unchanged-in-that-session data three times under 300ms RTT
// throttle. A short TTL cache (real mode only; mock mode's "fetch" is already a local read, not
// a network call) collapses that to one real fetch per window, while self-healing within 15s if
// some other flow ever mutates the profile without going through this file's own setters below
// (which update the cache immediately, not waiting on the TTL).
const PROFILE_CACHE_TTL_MS = 15_000;
let cachedProfile: { value: CandidateProfile; expiresAt: number } | null = null;
let profileRequest: Promise<CandidateProfile> | null = null;

function setProfileCache(value: CandidateProfile) {
  cachedProfile = { value, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
}

/** Sign-out and account-erasure both need this so the next session (possibly a different
 * account, same browser tab) never reads a stale, previous user's cached profile. */
export function clearMyProfileCache() {
  cachedProfile = null;
  profileRequest = null;
}

/** Merges the static seed candidate with whatever the user entered during onboarding. */
export async function getMyProfile(): Promise<CandidateProfile> {
  if (isRealMode()) {
    if (cachedProfile && cachedProfile.expiresAt > Date.now()) return cachedProfile.value;
    if (profileRequest) return profileRequest;
    profileRequest = apiFetch<CandidateProfileResponse>("/profile/me")
      .then(toCandidateProfile)
      .then((profile) => {
        setProfileCache(profile);
        return profile;
      })
      .finally(() => {
        profileRequest = null;
      });
    return profileRequest;
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
  cameForJob?: boolean;
  organization?: string;
  currentCtc?: number;
  expectedCtc?: number;
  preferredLocation?: string;
}): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/details", { method: "PUT", body: details })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
  }
  return getMyProfile();
}

export async function updateMySkills(skills: string[]): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/skills", { method: "PUT", body: { skills } })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
  }
  return patchOnboardingProfile({ skills });
}

export async function updateMyConsent(consent: ConsentSettings): Promise<CandidateProfile> {
  if (isRealMode()) {
    return apiFetch<CandidateProfileResponse>("/profile/me/consent", { method: "PUT", body: consent })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
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
    return apiFetch<CandidateProfileResponse>("/profile/me/location", { method: "PUT", body: input })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
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
    return apiFetch<CandidateProfileResponse>("/profile/me/autonomy", { method: "PUT", body: { autonomy } })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
  }
  return patchOnboardingProfile({ autonomy });
}

/** Records a resume upload + whatever structured fields the (simulated, mock-only) parse
 * confirmed. Real mode actually uploads the file; mock mode only ever needed its name. */
export async function updateMyResume(input: { file: File; skills?: string[] }): Promise<CandidateProfile> {
  if (isRealMode()) {
    const formData = new FormData();
    formData.append("file", input.file);
    return apiFetch<CandidateProfileResponse>("/profile/me/cv", { method: "POST", formData })
      .then(toCandidateProfile)
      .then((p) => { setProfileCache(p); return p; });
  }
  return patchOnboardingProfile({
    resumeFileName: input.file.name,
    resumeUploadedAt: new Date().toISOString(),
    skills: input.skills,
  });
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C profile revamp - the public/other-user view
// getMyProfile() never had (self-only before this pass, see DECISIONS.md). Mock mode has no
// per-candidate verification-tier state beyond CURRENT_CANDIDATE_ID's own (verification.ts's
// mock store is intentionally single-user, matching how there's only ever one "you" in this
// demo) - other candidates show the honest default (basic/unverified) rather than fabricating
// per-candidate state that doesn't exist anywhere else in mock mode.
/** Preview-only ids for the visibility rules (docs/FE-API-GAPS.md #60). */
export const HIDDEN_PREVIEW_ID = "cand-hidden";
export const NEARBY_ONLY_PREVIEW_IDS = ["cand-7"];

export async function getPublicProfile(userId: string): Promise<PublicCandidateProfile | undefined> {
  if (isRealMode()) return apiFetch<PublicCandidateProfile>(`/profile/${userId}`).catch(() => undefined);
  // Preview visibility rules: one neighbour is Nearby-only (signed-in people), one is Hidden.
  if (userId === HIDDEN_PREVIEW_ID) {
    return delay({ id: userId, name: "Hidden neighbour", avatarEmoji: "?", title: "", industry: "Sales", location: "", remote: false, skills: [], experienceYears: 0, openTo: [], careerHealth: 0, verificationLevel: "basic", phoneVerified: false, followerCount: 0, followingCount: 0, visibility: "hidden" }, 200);
  }
  const c = getCandidateById(userId);
  if (!c) return undefined;
  const counts = await getCounts(userId);
  return delay({
    visibility: NEARBY_ONLY_PREVIEW_IDS.includes(userId) ? "nearby" : "everyone",
    id: c.id, name: c.name, avatarEmoji: c.avatarEmoji, title: c.title, industry: c.industry,
    location: c.location, remote: c.remote, skills: c.skills, experienceYears: c.experienceYears,
    openTo: c.openTo, careerHealth: c.careerHealth, bio: c.bio,
    verificationLevel: "basic", phoneVerified: false,
    homeCity: c.homeCity,
    followerCount: counts.followerCount, followingCount: counts.followingCount, viewerFollows: counts.viewerFollows,
  }, 200);
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
    clearMyProfileCache();
    return;
  }
  return delay(undefined, 300);
}

/** Report a person (POST /profile/{id}/report). Preview mode records nothing. */
export async function reportPerson(id: string, body: { reason: string; evidenceUrls?: string[] }): Promise<void> {
  if (!isRealMode()) {
    await delay(undefined, 300);
    return;
  }
  try {
    await apiFetch<void>(`/profile/${id}/report`, { method: "POST", body });
  } catch (err) {
    // The backend sends one 400 for two different reasons (reporting yourself vs. a duplicate
    // open report — see AuthController... ModerationService.fileUserReport) with its own exact
    // wording each time; a single hardcoded "duplicate" message was wrong for the self-report
    // case (verified live: a self-report 400's body is "You can't report yourself", not a
    // duplicate). Pass the server's own message through instead of guessing which one it was.
    if (err instanceof ApiError && err.status === 400) throw new Error(err.message || "You've already reported this person — we're looking at it");
    if (err instanceof ApiError && err.status === 404) throw new Error("This profile isn't available");
    throw err;
  }
}

// --- M6 area 2: the onboarding basics (FE-API-GAPS #1-5, #53) and visibility (#60). Real mode
// only — mock mode keeps using the onboarding draft/localStorage it already has, unchanged. ---

export interface ProfileBasics {
  name: string;
  title: string;
  bio: string;
  photoUrl?: string;
  intents: string[];
  interests: string[];
  availability: string[];
}

export async function getProfileBasics(): Promise<ProfileBasics | undefined> {
  if (!isRealMode()) return undefined;
  return apiFetch<ProfileBasics>("/profile/me/basics");
}

/** PATCH /profile/me — every field optional, only what's passed changes. Mock mode no-ops;
 * the onboarding draft already holds these fields on this device. */
export async function patchProfile(patch: { name?: string; title?: string; bio?: string; availability?: string[]; interests?: string[]; photoUrl?: string }): Promise<void> {
  if (!isRealMode()) {
    await delay(undefined, 200);
    return;
  }
  await apiFetch<void>("/profile/me", { method: "PATCH", body: patch });
}

export async function setProfileIntents(intents: string[]): Promise<void> {
  if (!isRealMode()) {
    await delay(undefined, 200);
    return;
  }
  await apiFetch<void>("/profile/me/intents", { method: "PUT", body: { intents } });
}

/** Uploads the onboarding photo for real. The picker already hands back a small (~256px)
 * JPEG data URL (see PhotoPicker's own comment) — converted to a Blob here rather than
 * changing what the picker returns. Returns the stored photoUrl, or undefined in mock mode
 * (the data URL already in the draft is the "stored" value there). */
export async function uploadProfilePhoto(dataUrl: string): Promise<string | undefined> {
  if (!isRealMode()) return undefined;
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const formData = new FormData();
  formData.append("file", blob, "photo.jpg");
  const res = await apiFetch<ProfileBasics>("/profile/me/photo", { method: "POST", formData });
  return res.photoUrl;
}

export type ProfileVisibility = "nearby" | "everyone" | "hidden";

export async function getMyVisibility(): Promise<ProfileVisibility> {
  if (!isRealMode()) return "everyone";
  const res = await apiFetch<{ profile: ProfileVisibility }>("/profile/me/visibility");
  return res.profile;
}

export async function setMyVisibility(profile: ProfileVisibility): Promise<ProfileVisibility> {
  if (!isRealMode()) {
    await delay(undefined, 200);
    return profile;
  }
  const res = await apiFetch<{ profile: ProfileVisibility }>("/profile/me/visibility", { method: "PUT", body: { profile } });
  return res.profile;
}
