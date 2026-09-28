/**
 * Onboarding domain. Answers live in a same-browser draft until the person finishes; then
 * whatever Arena BE can store today is saved for real (approximate area / current location).
 * Everything else stays on this device — each such field is a row in docs/FE-API-GAPS.md,
 * and the screens say so instead of implying it was saved.
 */
import { updateMyLocation } from "@/lib/api/profile";

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

/** Launch zone first (Gachibowli), then its neighbours. Geography, not user data. */
export const AREAS = [
  "Gachibowli / Gopanapally",
  "Financial District / Nanakramguda",
  "Madhapur / Hitec City",
  "Kondapur",
  "Manikonda / Narsingi",
  "Serilingampally",
] as const;

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
      () => reject(new Error("Location wasn't shared. You can choose your area instead.")),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}

/** Answers Arena BE has no field for yet (docs/FE-API-GAPS.md) — they stay on this device. */
export function localOnlyFields(draft: EntryDraft, accountName: string): string[] {
  const fields: string[] = [];
  if (draft.photo) fields.push("photo");
  if (draft.displayName.trim() && draft.displayName.trim() !== accountName.trim()) fields.push("display name");
  if (draft.title.trim()) fields.push("title");
  if (draft.intro.trim()) fields.push("intro");
  if (draft.interests.length) fields.push("interests");
  if (draft.availability.length) fields.push("availability");
  if (draft.intents.length) fields.push("why you're here");
  return fields;
}

/** Saves what Arena BE can store today. Returns the answers that stayed on this device. */
export async function saveOnboarding(draft: EntryDraft, accountName: string): Promise<{ localOnly: string[] }> {
  if (draft.useCurrentLocation) {
    const pos = lastPosition ?? (await readCurrentPosition());
    await updateMyLocation({ consent: "precise", lat: pos.lat, lng: pos.lng });
  } else if (draft.area) {
    await updateMyLocation({ consent: "city", city: draft.area });
  }

  return { localOnly: localOnlyFields(draft, accountName) };
}
