/** Same-browser draft for the entry journey. Nothing here is sent until the person confirms it. */

export const ENTRY_DRAFT_KEY = "arena_entry_draft";
export const ENTRY_PENDING_KEY = "arena_entry_pending";

export const INTENTS = [
  { id: "meet", label: "Meet nearby people" },
  { id: "activities", label: "Join activities" },
  { id: "ask", label: "Ask for help" },
  { id: "offer", label: "Offer help" },
  { id: "projects", label: "Start or join projects" },
  { id: "explore-work", label: "Explore work" },
  { id: "job", label: "Find a job" },
  { id: "hire", label: "Hire locally" },
] as const;

export type EntryIntent = (typeof INTENTS)[number]["id"];

export type LocationChoice = "approximate" | "manual" | "none";

export interface EntryDraft {
  step: number;
  intents: EntryIntent[];
  locationChoice: LocationChoice | null;
  area: string;
  interests: string[];
  offerSkills: string[];
  careerSkills: string[];
  displayName: string;
  intro: string;
  availability: string;
  professionalTitle: string;
  industry: string;
  careerPublic: boolean;
}

export const EMPTY_DRAFT: EntryDraft = {
  step: 0,
  intents: [],
  locationChoice: null,
  area: "",
  interests: [],
  offerSkills: [],
  careerSkills: [],
  displayName: "",
  intro: "",
  availability: "",
  professionalTitle: "",
  industry: "",
  careerPublic: false,
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
  const raw = localStorage.getItem(ENTRY_DRAFT_KEY);
  if (raw === cachedRaw) return cachedDraft;
  cachedRaw = raw;
  if (!raw) {
    cachedDraft = EMPTY_DRAFT;
    return cachedDraft;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<EntryDraft>;
    cachedDraft = { ...EMPTY_DRAFT, ...parsed, intents: parsed.intents ?? [], careerPublic: parsed.careerPublic === true };
  } catch {
    cachedDraft = EMPTY_DRAFT;
  }
  return cachedDraft;
}

export function writeEntryDraft(draft: EntryDraft) {
  cachedDraft = draft;
  cachedRaw = JSON.stringify(draft);
  localStorage.setItem(ENTRY_DRAFT_KEY, cachedRaw);
  window.dispatchEvent(new Event("arena-entry"));
}

export function markEntryPending() {
  localStorage.setItem(ENTRY_PENDING_KEY, "1");
}

export function entryIsPending() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENTRY_PENDING_KEY) === "1";
}

export function clearEntryPending() {
  localStorage.removeItem(ENTRY_PENDING_KEY);
}
