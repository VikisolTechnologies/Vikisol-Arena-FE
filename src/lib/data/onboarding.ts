/**
 * Onboarding domain. Answers live in a same-browser draft until the person finishes; then
 * whatever Arena BE can store today is saved for real (approximate area / current location).
 * Everything else stays on this device — each such field is a row in docs/FE-API-GAPS.md,
 * and the screens say so instead of implying it was saved.
 */
import { patchProfile, setProfileIntents, updateMyLocation, uploadProfilePhoto } from "@/lib/api/profile";

const DRAFT_KEY = "arena_entry_draft";
const PENDING_KEY = "arena_entry_pending";

/** Ids kept compatible with the ones the Feed already reads. */
export const INTENTS = [
  { id: "activities", label: "Find activities", detail: "Sports, hobbies, events", joined: "activities" },
  { id: "meet", label: "Meet useful people", detail: "Neighbors with shared interests", joined: "meeting people" },
  { id: "ask", label: "Ask for help", detail: "Get advice or support", joined: "getting help" },
  { id: "offer", label: "Offer a skill", detail: "Share what you know", joined: "sharing skills" },
  { id: "job", label: "Find work", detail: "Opportunities nearby", joined: "finding work" },
  { id: "hire", label: "Hire or recruit", detail: "Find local talent", joined: "hiring locally" },
  { id: "projects", label: "Start a project", detail: "Turn ideas into action", joined: "projects" },
  { id: "explore", label: "Explore first", detail: "Just looking for now", joined: "exploring" },
] as const;

export type EntryIntent = (typeof INTENTS)[number]["id"];
const INTENT_IDS = new Set<string>(INTENTS.map((i) => i.id));

export const SUGGESTED_INTERESTS = [
  "Running",
  "Badminton",
  "Learning",
  "Volunteering",
  "Food",
  "Photography",
  "Community events",
  "Environment",
] as const;

export const AVAILABILITY = ["Weekdays", "Weekends", "Evenings"] as const;
export type Availability = (typeof AVAILABILITY)[number];

export const INTRO_MAX = 160;

export interface EntryDraft {
  intents: EntryIntent[];
  area: string;
  useCurrentLocation: boolean;
  interests: string[];
  photo: string | null;
  displayName: string;
  title: string;
  intro: string;
  availability: Availability[];
  /** ISO yyyy-mm-dd. Submitted to the backend immediately when the age gate is passed — see
   * AgeGateStep — not deferred to the final save, so it's set even if the person later picks
   * "Explore first" and skips the rest of onboarding. */
  dateOfBirth: string;
}

export const EMPTY_DRAFT: EntryDraft = {
  intents: [],
  area: "",
  useCurrentLocation: false,
  interests: [],
  photo: null,
  displayName: "",
  title: "",
  intro: "",
  availability: [],
  dateOfBirth: "",
};

let cachedRaw: string | null | undefined;
let cachedDraft: EntryDraft = EMPTY_DRAFT;

export function subscribeEntryDraft(onChange: () => void) {
  const refresh = () => {
    cachedRaw = undefined;
    onChange();
  };
  window.addEventListener("arena-entry", refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener("arena-entry", refresh);
    window.removeEventListener("storage", refresh);
  };
}

export function readEntryDraft(): EntryDraft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (raw === cachedRaw) return cachedDraft;
  cachedRaw = raw;
  if (!raw) {
    cachedDraft = EMPTY_DRAFT;
    return cachedDraft;
  }
  try {
    const p = JSON.parse(raw) as Partial<EntryDraft>;
    cachedDraft = {
      ...EMPTY_DRAFT,
      ...p,
      intents: (p.intents ?? []).filter((id): id is EntryIntent => INTENT_IDS.has(id)),
      interests: Array.isArray(p.interests) ? p.interests : [],
      availability: Array.isArray(p.availability) ? p.availability : [],
      useCurrentLocation: p.useCurrentLocation === true,
      photo: typeof p.photo === "string" ? p.photo : null,
    };
  } catch {
    cachedDraft = EMPTY_DRAFT;
  }
  return cachedDraft;
}

export function writeEntryDraft(draft: EntryDraft) {
  cachedDraft = draft;
  cachedRaw = JSON.stringify(draft);
  try {
    localStorage.setItem(DRAFT_KEY, cachedRaw);
  } catch {
    // Storage full (a large photo): keep everything but the photo rather than lose the draft.
    cachedRaw = JSON.stringify({ ...draft, photo: null });
    localStorage.setItem(DRAFT_KEY, cachedRaw);
  }
  window.dispatchEvent(new Event("arena-entry"));
}

export function markEntryPending() {
  localStorage.setItem(PENDING_KEY, "1");
}

export function entryIsPending() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PENDING_KEY) === "1";
}

export function clearEntryPending() {
  localStorage.removeItem(PENDING_KEY);
}

/** Current position, asked only when the person turns the toggle on. Kept in memory only —
 *  never written to the draft — and the backend stores it coarsened (geohash). */
let lastPosition: { lat: number; lng: number } | null = null;

export function readCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("This browser can't share a location. Choose your area instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(lastPosition);
      },
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED
        ? "Location is blocked. In your browser's site settings for Arena, allow Location, then try again."
        : "Location wasn't shared. You can type your area instead.")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}

/** Answers Arena BE has no field for yet (docs/FE-API-GAPS.md) — they stay on this device.
 * As of M6 area 2, that's nothing from this step: name, title, intro, interests, availability,
 * "why you're here" (intents) and photo all persist via PATCH /profile/me /
 * PUT /profile/me/intents / POST /profile/me/photo. Kept as an empty-returning function (not
 * deleted) so IdentityStep's "what's local-only" note degrades honestly if a future field is
 * added here without its backend counterpart yet. */
export function localOnlyFields(_draft: EntryDraft, _accountName: string): string[] {
  return [];
}

/** Saves everything Arena BE can store today — area/location, name/title/bio, intents,
 * interests, availability and photo. Returns the answers that stayed on this device (should be
 * none in real mode; see localOnlyFields). Runs the independent writes in parallel; if one
 * fails the caller's catch still has the others' results in the draft to retry from. */
export async function saveOnboarding(draft: EntryDraft, accountName: string): Promise<{ localOnly: string[] }> {
  const writes: Promise<unknown>[] = [
    patchProfile({
      name: draft.displayName.trim() || accountName,
      title: draft.title.trim(),
      bio: draft.intro.trim(),
      availability: draft.availability,
      interests: draft.interests,
    }),
    setProfileIntents(draft.intents),
  ];
  if (draft.useCurrentLocation) {
    const pos = lastPosition ?? (await readCurrentPosition());
    writes.push(updateMyLocation({ consent: "precise", lat: pos.lat, lng: pos.lng }));
  } else if (draft.area) {
    writes.push(updateMyLocation({ consent: "city", city: draft.area }));
  }
  if (draft.photo) writes.push(uploadProfilePhoto(draft.photo));

  await Promise.all(writes);
  return { localOnly: localOnlyFields(draft, accountName) };
}
