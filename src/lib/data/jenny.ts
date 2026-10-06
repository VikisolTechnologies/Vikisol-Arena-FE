/**
 * Jenny domain for the P8 boards (FE-BPLUS-BUILD §7 P8; blueprint §2). The shapes below follow the
 * PROPOSED v2 contract (ContextualBrief, InterpretedIntent, expanded ProposedAction preview,
 * AutomationRecipe, QueueItem) — none of it is BUILT in JennySol yet, so every Jenny surface here
 * is permanently off (JENNY_PREVIEW, below) and renders nothing. Real proposals from the live v1
 * gateway keep using `JennyActionCard`.
 *
 * What's computed rather than invented: opportunities, "why this matches" reasons and today's
 * plan are derived from the (preview) feed and the person's own interests/availability — never a
 * score, never a ranking by fit (correction #4). Decisions and toggles live on this device.
 */
import { distanceKm, whenLabel, type FeedItem } from "@/lib/data/feed";
import { guessType } from "@/lib/activities/taxonomy";
import type { Post } from "@/lib/types";

/** Jenny's P8 surfaces are PROPOSED-contract preview only (see file header) - permanently off,
 * same as it already was in any real-data build. Every JENNY_PREVIEW-gated component
 * (JennyScreen.tsx's Today/Automations/Reminders/RecentActivity, WorkScreen.tsx's Jenny
 * sections, etc.) already never mounts when this is false, so the sample content below is never
 * read. */
export const JENNY_PREVIEW = false;

const DRAFT_SENTENCE = "";
const RECENT_FIXTURES: { text: string; icon: "post" | "calendar" | "invite"; at: string }[] = [];
const REMINDER_FIXTURES: { id: string; title: string; detail: string; when: string }[] = [];
function queueFixtures(): QueueItem[] {
  return [];
}

/* ── Expanded ProposedAction preview (PROPOSED) ── */
export interface ActionPreview {
  question: string;
  /** The exact words that would be sent or shared. */
  content: string;
  /** "— Priya (via Arena)" */
  signature: string;
  recipients: { summary: string; people: string[] };
  dataUsed: string[];
  exactLocationShared: boolean;
  /** Correction #5: the undo line shows only when this is true. */
  reversible: boolean;
  approveLabel: string;
}

export type QueueGroup = "approval" | "handle" | "waiting";
export type QueueIcon = "post" | "invite" | "share" | "calendar" | "notify" | "project" | "join" | "job";

export interface QueueItem {
  id: string;
  group: QueueGroup;
  icon: QueueIcon;
  title: string;
  detail: string;
  /** The line that says what's needed (orange on approval rows). */
  flag?: string;
  at: string;
  /** Review opens the approval sheet … */
  action?: ActionPreview;
  /** … or a page (a draft to finish, a request to look at). */
  href?: string;
  /** How it reads in Jenny's "Today's plan". */
  planTitle?: string;
  /** "Jenny can handle" rows come from an automation the person can turn off. */
  automation?: AutomationId;
}

export { DRAFT_SENTENCE, RECENT_FIXTURES, REMINDER_FIXTURES };

/* ── Decisions and toggles on this device ── */
type Decision = { state: "approved" | "kept"; at: string; note: string };
const DECISIONS = "arena_jenny_decisions";
const AUTOMATIONS = "arena_jenny_automations";
const JOB_SEARCH = "arena_jenny_job_search";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("arena-jenny"));
  } catch {
    /* storage blocked: the choice lasts this visit only */
  }
}

export const readDecisions = () => readJSON<Record<string, Decision>>(DECISIONS, {});

/** The queue as it stands: approved items move to "Waiting on others". */
export function loadQueue(): QueueItem[] {
  if (!JENNY_PREVIEW) return [];
  const decided = readDecisions();
  const auto = readAutomations();
  return queueFixtures().filter((q) => !q.automation || auto[q.automation]).map((q) => {
    const d = decided[q.id];
    if (d?.state !== "approved") return q;
    return { ...q, group: "waiting" as const, title: q.action?.recipients.people.length === 1 ? `Message to ${q.action.recipients.people[0].split(" ")[0]}` : q.title, detail: "Approved by you", flag: d.note, at: d.at, action: undefined };
  });
}

/** Approve once. These are sample items against the real backend, so nothing is sent and the
 *  note says so. */
export async function approve(item: QueueItem): Promise<Decision> {
  const note = "Sample item — nothing was sent";
  const d: Decision = { state: "approved", at: new Date().toISOString(), note };
  writeJSON(DECISIONS, { ...readDecisions(), [item.id]: d });
  return d;
}

/** "Always ask me": nothing is sent; the item stays for later and Jenny keeps asking. */
export function keepAsking(item: QueueItem) {
  writeJSON(DECISIONS, { ...readDecisions(), [item.id]: { state: "kept", at: new Date().toISOString(), note: "You'll be asked each time" } });
}

/* ── Automations the person controls (board: "Automations you control") ── */
export const AUTOMATION_ROWS = [
  { id: "calendar", title: "Add relevant events to calendar", detail: "You approve each one" },
  { id: "invite", title: "Suggest people to invite", detail: "You approve each one" },
  { id: "groups", title: "Draft updates for your groups", detail: "You approve before sending" },
] as const;
export type AutomationId = (typeof AUTOMATION_ROWS)[number]["id"];
const AUTOMATION_DEFAULTS: Record<AutomationId, boolean> = { calendar: true, invite: true, groups: false };
export const readAutomations = () => readJSON(AUTOMATIONS, AUTOMATION_DEFAULTS);
export const writeAutomations = (v: Record<AutomationId, boolean>) => writeJSON(AUTOMATIONS, v);

/* ── The job-search recipe (automation board) ── */
export interface JobSearchRecipe {
  on: boolean;
  shortlist: boolean;
  drafts: boolean;
  reminders: boolean;
  /** Per-field audience chosen on "Privacy & permission" (device-only, gap #19). */
  fields: Record<string, "private" | "apply" | "employers">;
  approveEachShare: boolean;
  submitted: string[];
}
const RECIPE_DEFAULTS: JobSearchRecipe = { on: false, shortlist: true, drafts: true, reminders: true, fields: {}, approveEachShare: true, submitted: [] };
export const readJobSearch = () => readJSON(JOB_SEARCH, RECIPE_DEFAULTS);
export const writeJobSearch = (v: JobSearchRecipe) => writeJSON(JOB_SEARCH, v);

export function subscribeJenny(cb: () => void) {
  window.addEventListener("arena-jenny", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("arena-jenny", cb);
    window.removeEventListener("storage", cb);
  };
}

/* ── Opportunities and "why this matches you" — reasons, never a number ── */
export interface Me {
  interests: string[];
  availability: string[];
  origin: { lat: number; lng: number };
}

const words = (s: string) => s.toLowerCase();
const hay = (p: Pick<FeedItem, "title" | "body" | "tags">) => words(`${p.title ?? ""} ${p.body} ${p.tags.join(" ")}`);
const INTEREST_WORDS: Record<string, string[]> = {
  running: ["run", "5k", "jog"],
  badminton: ["badminton", "shuttle"],
  volunteering: ["volunteer", "clean-up", "cleanup", "planting"],
  food: ["cook", "meal", "lunch", "food"],
  cricket: ["cricket"],
  photography: ["photo"],
  gardening: ["garden", "plant"],
  books: ["book"],
  pottery: ["pottery", "clay"],
  environment: ["lake", "tree", "clean-up", "green"],
};
export function interestHit(p: Pick<FeedItem, "title" | "body" | "tags">, interests: string[]) {
  const h = hay(p);
  return interests.find((i) => (INTEREST_WORDS[i.toLowerCase()] ?? [i.toLowerCase()]).some((w) => h.includes(w)));
}

function usuallyFree(iso: string | undefined, availability: string[]) {
  if (!iso || !availability.length) return false;
  const d = new Date(iso);
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const evening = d.getHours() >= 17;
  return availability.some((a) => (a === "Weekends" && weekend) || (a === "Evenings" && evening) || (a === "Weekdays" && !weekend));
}

/** Up to two things nearby worth a look: not yours, not already joined, upcoming, and touching an
 *  interest you gave. Soonest first — never ordered by "fit". */
export function opportunities(items: FeedItem[], me: Me, radiusKm = 5): FeedItem[] {
  const soon = Date.now() + 8 * 86_400_000;
  return items
    .filter((i) => (i.itemType === "activity" || i.itemType === "ask") && !i.mine && !i.myJoinStatus && i.status === "open")
    .filter((i) => i.startsAt && Date.parse(i.startsAt) > Date.now() && Date.parse(i.startsAt) < soon)
    .filter((i) => {
      const km = distanceKm(me.origin, { lat: i.approxLat, lng: i.approxLng });
      return km != null && km <= radiusKm && !!interestHit(i, me.interests);
    })
    .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))
    .slice(0, 2);
}

export function shortWhen(item: Pick<FeedItem, "startsAt" | "endsAt">) {
  if (!item.startsAt) return null;
  const s = new Date(item.startsAt);
  const day = whenLabel(item.startsAt)?.split(" · ")[0] ?? "";
  const t = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined }).toUpperCase().replace(/\s/g, " ");
  const e = item.endsAt ? new Date(item.endsAt) : null;
  return e ? `${day}, ${t(s).replace(/ (AM|PM)$/, s.getHours() < 12 === e.getHours() < 12 ? "" : " $1")}–${t(e)}` : `${day}, ${t(s)}`;
}

export interface MatchExplanation {
  reasons: string[];
  consider: string[];
}

/** Concrete reasons from what the person told Arena and did — each line is checkable. */
export function explainMatch(post: Post | FeedItem, me: Me, joined: (Post | FeedItem)[]): MatchExplanation {
  const reasons: string[] = [];
  const sub = guessType(post).subtype;
  const similar = joined.filter((j) => j.id !== post.id && guessType(j).subtype.id === sub.id).length;
  if (similar > 0 && sub.id !== "other") reasons.push(similar === 1 ? `You've joined a ${sub.label.toLowerCase()} like this before` : `You've joined ${similar} similar ${sub.label.toLowerCase()}s`);
  const interest = interestHit(post, me.interests);
  if (interest) reasons.push(`Matches your interest in ${interest.toLowerCase()}`);
  const km = distanceKm(me.origin, { lat: post.approxLat, lng: post.approxLng });
  const free = usuallyFree(post.startsAt, me.availability);
  if (km != null && km <= 5 && free) reasons.push("Nearby and at a time you're usually free");
  else if (km != null) reasons.push(`${Math.round(km * 10) / 10} km from you`);
  else if (free) reasons.push("At a time you're usually free");
  const consider: string[] = [];
  const isAsk = ("itemType" in post ? post.itemType : post.intentType) === "ask";
  if (!isAsk && post.visibility === "approval") consider.push("Exact meeting point shared after the host approves you");
  else consider.push("Exact meeting point shared after you join");
  if (/lake|park|run|trek|cricket|clean|planting|outdoor|ground/.test(hay(post))) consider.push("Check the weather before heading out");
  const left = post.capacity != null && post.spotsFilled != null ? post.capacity - post.spotsFilled : null;
  if (left != null && left > 0 && left <= 3) consider.push(`Only ${left} ${left === 1 ? "spot" : "spots"} left`);
  return { reasons, consider };
}

/* ── Jenny today: a plan from what's actually on, plus what needs you ── */
export interface PlanRow {
  time: string;
  title: string;
  detail: string;
  urgent?: boolean;
  href?: string;
}

export function todaysPlan(items: FeedItem[], queue: QueueItem[], origin: Me["origin"]): PlanRow[] {
  const horizon = Date.now() + 30 * 3_600_000;
  const on = items
    .filter((i) => i.startsAt && (i.mine || i.myJoinStatus === "approved") && Date.parse(i.startsAt) > Date.now() - 3_600_000 && Date.parse(i.startsAt) < horizon)
    .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))
    .map((i): PlanRow => {
      const km = distanceKm(origin, { lat: i.approxLat, lng: i.approxLng });
      const d = new Date(i.startsAt!);
      const today = d.toDateString() === new Date().toDateString();
      return {
        time: `${today ? "" : "Tomorrow "}${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase()}`,
        title: i.title ?? i.body.slice(0, 60),
        detail: [i.mine ? "You're hosting" : "You're going", i.locationText?.split(",")[0], km != null ? `${Math.round(km * 10) / 10} km` : null].filter(Boolean).join(" · "),
        href: `/feed/${i.id}`,
      };
    });
  const first = queue.find((q) => q.group === "approval");
  const approvals = first ? [{ time: "Now", title: first.planTitle ?? first.title, detail: "Needs your approval", urgent: true, href: first.href ?? "/work?tab=approval" }] : [];
  return [...approvals, ...on].slice(0, 4);
}

export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}
