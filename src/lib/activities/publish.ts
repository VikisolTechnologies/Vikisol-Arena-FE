import type { CreatePostInput } from "@/lib/api/posts";
import type { UpdateActivityDetailsInput } from "@/lib/api/activities";
import type { MoneyRange, Schema, Values } from "@/lib/intake/types";
import { findSubtype } from "@/lib/activities/taxonomy";
import { publicDetailLines } from "@/lib/intake/schemas/activity";

/** A date ("2026-10-12") and a time ("06:30") in the launch area (IST) → ISO.
 *
 * Bug fixed during M6 area 3b: this used to default a missing `time` to "00:00" so it could
 * double as both `start` (always required by the schema) and the optional `end`. For `end`,
 * "not given" was then silently turned into *midnight at the start of that date* — almost
 * always earlier than the activity's own `start` time, which made a freshly published evening
 * activity with no explicit end look "already started or ended" to the backend
 * (`PostService.requireOpenCapacity`) the moment anyone tried to join it. A missing time now
 * means "no instant to report" (`undefined`), not a wrong one. */
export function istToIso(date?: unknown, time?: unknown): string | undefined {
  if (typeof date !== "string" || !date || typeof time !== "string" || !time) return undefined;
  const d = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

const LEVEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", "all-levels": "All levels" };

/**
 * The host's answers → the real create-post call. Public answers also go into the post text so
 * existing feed/summary cards (which only ever read `post.body`) keep showing them; the
 * structured truth now lives in `PUT /activities/{id}/details` too (`toActivityDetails` below,
 * M6 area 3b) — host questions, waitlist, repeat and min size are no longer dropped on the
 * floor. Private answers (exact point, online link) never go into public text.
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

/** The structured fields `PUT /activities/{id}/details` stores — called right after the post
 * is created (M6 area 3b). `typeAnswers` is the "type" step's raw field values verbatim
 * (cricket format/overs, trek difficulty, and so on); everything else maps one field to one. */
export function toActivityDetails(schema: Schema, subtypeId: string, v: Values): UpdateActivityDetailsInput {
  const sub = findSubtype(subtypeId);
  const typeStep = schema.steps.find((s) => s.id === "type");
  const typeAnswers: Record<string, unknown> = {};
  for (const f of typeStep?.fields ?? []) {
    const val = v[f.id];
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    typeAnswers[f.id] = val;
  }
  const size = (v.size as MoneyRange | undefined) ?? {};
  const bring = (v.bring as string[] | undefined) ?? [];
  const cost: UpdateActivityDetailsInput["cost"] =
    v.cost === "shared"
      ? { type: "shared", perPersonInr: (v.costPer as MoneyRange | undefined)?.min, note: typeof v.costNote === "string" ? v.costNote.trim() || undefined : undefined }
      : { type: "free" };
  return {
    category: sub?.category.id,
    subtype: subtypeId,
    level: typeof v.level === "string" ? v.level : undefined,
    cost,
    typeAnswers,
    bring,
    accessibility: typeof v.accessNote === "string" ? v.accessNote.trim() || undefined : undefined,
    indoor: v.setting === "indoor" ? true : v.setting === "outdoor" ? false : undefined,
    minSize: typeof size.min === "number" ? size.min : undefined,
    waitlist: v.waitlist === true,
    repeat: typeof v.repeat === "string" ? v.repeat : undefined,
    womenOnly: v.womenOnly === true,
    reach: "nearby",
  };
}

/** "Questions for joiners" (the "who" step's `questions` list, up to 3) → `PUT
 * /activities/{id}/questions`. Every one required — the schema has no per-question optional
 * toggle yet, and a host can always widen that later from the activity screen (`setActivityQuestions`
 * via the host-questions editor added in ActivityScreen.tsx). */
export function toHostQuestions(v: Values): { text: string; required: boolean }[] {
  const questions = (v.questions as string[] | undefined) ?? [];
  return questions.filter((q) => q.trim()).map((q) => ({ text: q.trim(), required: true }));
}
