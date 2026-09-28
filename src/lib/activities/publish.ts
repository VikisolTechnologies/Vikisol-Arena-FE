import type { CreatePostInput } from "@/lib/api/posts";
import type { MoneyRange, Schema, Values } from "@/lib/intake/types";
import { findSubtype } from "@/lib/activities/taxonomy";
import { publicDetailLines } from "@/lib/intake/schemas/activity";

/** A date ("2026-10-12") and a time ("06:30") in the launch area (IST) → ISO. */
export function istToIso(date?: unknown, time?: unknown): string | undefined {
  if (typeof date !== "string" || !date) return undefined;
  const t = typeof time === "string" && time ? time : "00:00";
  const d = new Date(`${date}T${t}:00+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const LEVEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", "all-levels": "All levels" };

/**
 * The host's answers → the real create-post call. Public answers go into the post text so joiners
 * see them today; structured fields, host questions, waitlist, repeat and min size wait for the
 * API (FE-API-GAPS #23). Private answers (exact point, online link) never go into public text.
 */
export function toCreatePost(schema: Schema, subtypeId: string, v: Values): CreatePostInput {
  const sub = findSubtype(subtypeId);
  const size = (v.size as MoneyRange | undefined) ?? {};
  const lines: string[] = [];
  if (typeof v.description === "string" && v.description.trim()) lines.push(v.description.trim());
  const facts = [
    `Level: ${LEVEL[String(v.level)] ?? "All levels"}`,
    v.cost === "shared" ? `Shared cost: ₹${(v.costPer as MoneyRange | undefined)?.min ?? "?"} per person${v.costNote ? ` (${v.costNote})` : ""}` : "Free",
    ...publicDetailLines(schema, v),
  ];
  const bring = (v.bring as string[] | undefined) ?? [];
  if (bring.length) facts.push(`Bring: ${bring.join(", ")}`);
  if (typeof v.accessNote === "string" && v.accessNote.trim()) facts.push(`Accessibility: ${v.accessNote.trim()}`);
  if (v.setting) facts.push(v.setting === "indoor" ? "Indoor" : "Outdoor");
  lines.push(facts.join("\n"));
  const womenOnly = v.womenOnly === true;
  const exactParts = [typeof v.point === "string" ? v.point.trim() : "", v.link ? `Link: ${v.link}` : ""].filter(Boolean);
  return {
    intentType: "activity",
    title: String(v.title ?? "").trim(),
    body: lines.join("\n\n"),
    locationText: String(v.area ?? "").trim() || undefined,
    audience: "global",
    visibility: womenOnly || v.joining !== "open" ? "approval" : "public",
    capacity: typeof size.max === "number" ? size.max : undefined,
    tags: [sub?.category.label, sub?.label, LEVEL[String(v.level)], womenOnly ? "Women-only" : undefined].filter((x): x is string => !!x),
    startsAt: istToIso(v.date, v.start),
    endsAt: istToIso(v.date, v.end),
    exactMeetingPoint: exactParts.join(" · ") || undefined,
  };
}
