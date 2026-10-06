import type { Post } from "@/lib/types";

export const PREFERRED_TIMES = ["Flexible", "Today", "This weekend", "Next week"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];

/** A preferred time becomes a real window on the post (startsAt/endsAt), or none for Flexible. */
export function timeWindow(choice: PreferredTime, now = new Date()): { startsAt?: string; endsAt?: string } {
  const at = (d: Date, h: number, min = 0) => {
    const x = new Date(d);
    x.setHours(h, min, 0, 0);
    return x;
  };
  if (choice === "Today") return { startsAt: new Date(now).toISOString(), endsAt: at(now, 23, 59).toISOString() };
  if (choice === "This weekend") {
    // Saturday 8 AM → Sunday 9 PM; already the weekend → from now.
    const day = now.getDay();
    const sun = new Date(now);
    sun.setDate(now.getDate() + (day === 0 ? 0 : 7 - day));
    const sat = new Date(sun);
    sat.setDate(sun.getDate() - 1);
    const start = day === 0 || day === 6 ? now : at(sat, 8);
    return { startsAt: start.toISOString(), endsAt: at(sun, 21).toISOString() };
  }
  if (choice === "Next week") {
    const mon = new Date(now);
    mon.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { startsAt: at(mon, 8).toISOString(), endsAt: at(sun, 21).toISOString() };
  }
  return {};
}

/** "This weekend · Flexible"-style line from the post's real window. */
export function needWhen(post: Pick<Post, "startsAt" | "endsAt">): string {
  if (!post.startsAt) return "Flexible time";
  const s = new Date(post.startsAt);
  const e = post.endsAt ? new Date(post.endsAt) : null;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();
  if (sameDay(s, today) && (!e || sameDay(e, today))) return "Today";
  if (e && (s.getDay() === 6 || s.getDay() === 0) && e.getDay() === 0 && e.getTime() - s.getTime() < 3 * 86_400_000) return "This weekend";
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return e && !sameDay(s, e) ? `${fmt(s)} – ${fmt(e)}` : fmt(s);
}

export const isNeed = (p: Pick<Post, "intentType">) => p.intentType === "ask";

/* ── Meeting link: posted into the room as a message (no separate endpoint). ── */
export const MEETING_LINK_PREFIX = "Meeting link: ";
const URL_RE = /https:\/\/[^\s]+/;
export function isMeetingUrl(value: string) {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
/** The newest meeting link anyone in the room shared, or null. */
export function latestMeetingLink(messages: readonly { content: string }[] | null): string | null {
  if (!messages) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const c = messages[i].content;
    if (c.startsWith(MEETING_LINK_PREFIX)) return c.match(URL_RE)?.[0] ?? null;
  }
  return null;
}
