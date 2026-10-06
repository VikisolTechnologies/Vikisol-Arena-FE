import type { AutonomyLevel, CandidateProfile, ConsentSettings, Industry, LocationConsent, OpenTo, PublicCandidateProfile } from "@/lib/types";
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

/** Syncs the onboarding wizard's name/title/industry/experience/rate/openTo to arena-api. */
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
  return apiFetch<CandidateProfileResponse>("/profile/me/details", { method: "PUT", body: details })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
}

export async function updateMySkills(skills: string[]): Promise<CandidateProfile> {
  return apiFetch<CandidateProfileResponse>("/profile/me/skills", { method: "PUT", body: { skills } })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
}

export async function updateMyConsent(consent: ConsentSettings): Promise<CandidateProfile> {
  return apiFetch<CandidateProfileResponse>("/profile/me/consent", { method: "PUT", body: consent })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md §5 (Phase B). "precise" sends a real one-shot browser
// Geolocation reading (its own explicit permission prompt, independent of any other consent),
// "city" sends a manually-typed city name only, "off" sends neither - the caller (Settings page)
// is responsible for gathering lat/lng via navigator.geolocation before calling this with
// consent="precise".
export async function updateMyLocation(input: { consent: LocationConsent; lat?: number; lng?: number; city?: string }): Promise<CandidateProfile> {
  return apiFetch<CandidateProfileResponse>("/profile/me/location", { method: "PUT", body: input })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
}

export async function updateMyAutonomy(autonomy: AutonomyLevel): Promise<CandidateProfile> {
  return apiFetch<CandidateProfileResponse>("/profile/me/autonomy", { method: "PUT", body: { autonomy } })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
}

/** Records a resume upload + whatever structured fields the (simulated, mock-only) parse
 * confirmed. Real mode actually uploads the file; mock mode only ever needed its name. */
export async function updateMyResume(input: { file: File; skills?: string[] }): Promise<CandidateProfile> {
  const formData = new FormData();
  formData.append("file", input.file);
  return apiFetch<CandidateProfileResponse>("/profile/me/cv", { method: "POST", formData })
    .then(toCandidateProfile)
    .then((p) => { setProfileCache(p); return p; });
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
  return apiFetch<PublicCandidateProfile>(`/profile/${userId}`).catch(() => undefined);
}

/** Small, capped nudge to Career Health when verified work completes — a won bid, an accepted
 * milestone. Mock-only: real mode's careerHealth is computed server-side from actual activity. */
export async function bumpMyCareerHealth(delta: number): Promise<CandidateProfile> {
  return getMyProfile();
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
  return apiFetch<DataExport>("/profile/me/export");
}

/** Right-to-erasure. Real mode calls the backend (anonymizes the profile, disables the
 * account, revokes every session - see CandidateProfileService.deleteMyAccount) and the caller
 * is responsible for clearing the local session/token afterward. Mock mode just clears local
 * state directly since there's no server record to erase. */
export async function deleteMyAccount(): Promise<void> {
  await apiFetch<void>("/profile/me", { method: "DELETE" });
  clearMyProfileCache();
}

/** Report a person (POST /profile/{id}/report). Preview mode records nothing. */
export async function reportPerson(id: string, body: { reason: string; evidenceUrls?: string[] }): Promise<void> {
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
  return apiFetch<ProfileBasics>("/profile/me/basics");
}

/** PATCH /profile/me — every field optional, only what's passed changes. Mock mode no-ops;
 * the onboarding draft already holds these fields on this device. */
export async function patchProfile(patch: { name?: string; title?: string; bio?: string; availability?: string[]; interests?: string[]; photoUrl?: string }): Promise<void> {
  await apiFetch<void>("/profile/me", { method: "PATCH", body: patch });
}

export async function setProfileIntents(intents: string[]): Promise<void> {
  await apiFetch<void>("/profile/me/intents", { method: "PUT", body: { intents } });
}

/** Uploads the onboarding photo for real. The picker already hands back a small (~256px)
 * JPEG data URL (see PhotoPicker's own comment) — converted to a Blob here rather than
 * changing what the picker returns. Returns the stored photoUrl, or undefined in mock mode
 * (the data URL already in the draft is the "stored" value there). */
export async function uploadProfilePhoto(dataUrl: string): Promise<string | undefined> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const formData = new FormData();
  formData.append("file", blob, "photo.jpg");
  const res = await apiFetch<ProfileBasics>("/profile/me/photo", { method: "POST", formData });
  return res.photoUrl;
}

export type ProfileVisibility = "nearby" | "everyone" | "hidden";

export async function getMyVisibility(): Promise<ProfileVisibility> {
  const res = await apiFetch<{ profile: ProfileVisibility }>("/profile/me/visibility");
  return res.profile;
}

export async function setMyVisibility(profile: ProfileVisibility): Promise<ProfileVisibility> {
  const res = await apiFetch<{ profile: ProfileVisibility }>("/profile/me/visibility", { method: "PUT", body: { profile } });
  return res.profile;
}
