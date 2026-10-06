/** Discover intent (P8): which filters a sentence sets. Kept apart from the (preview-only,
 *  lazily loaded) IntentResults component so Discover only loads that when it can show it. */
import { DEFAULT_RADIUS_KM } from "@/lib/data/feed";
import type { Understood } from "@/lib/jenny/understand";

export type When = "any" | "today" | "weekend" | "week" | "date";
export type Level = "any" | "beginner" | "intermediate" | "advanced";
export type Setting = "either" | "indoor" | "outdoor";
export interface Intent {
  subtype: string | null;
  level: Level;
  when: When;
  date?: string;
  radius: number | null;
  setting: Setting;
}

/** An intent the words can carry: an activity type, or a level/day for an activity. */
export function intentFrom(u: Understood | null): Intent | null {
  if (!u || u.kind !== "activity" || (!u.subtype && !u.level && !u.dayWord)) return null;
  const when: When = u.dayWord === "This weekend" ? "weekend" : u.dayWord === "Today" || u.dayWord === "Tonight" ? "today" : u.date ? "date" : "any";
  return { subtype: u.subtype ?? null, level: u.level && u.level !== "all-levels" ? u.level : "any", when, date: u.date, radius: DEFAULT_RADIUS_KM, setting: u.setting ?? "either" };
}
