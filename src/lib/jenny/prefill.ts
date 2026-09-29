/**
 * Jenny pre-fill (ARENA-APP-FLOW §2, §10): one sentence → answers in an intake draft, with the
 * fields she filled marked "Jenny filled — check" until the person touches them. Nothing is
 * published from here; the person still walks the intake (or its review) and taps publish.
 */
import { activitySchema } from "@/lib/intake/schemas/activity";
import { needSchema, offerSchema } from "@/lib/intake/schemas/need";
import { PROJECT_SCHEMA } from "@/lib/intake/schemas/project";
import { isEmpty, problem, visibleFields, visibleSteps, type Schema, type Values } from "@/lib/intake/types";
import { findSubtype } from "@/lib/activities/taxonomy";
import type { DraftKind, Understood } from "@/lib/jenny/understand";

export const ACTIVITY_KIND_KEY = "arena_activity_kind";
const filledKey = (draftKey: string) => `arena_jenny_filled_${draftKey}`;

export interface Prefill {
  kind: DraftKind;
  draftKey: string;
  schema: Schema;
  values: Values;
  filled: string[];
  /** Where the real intake for this draft lives. */
  href: string;
  subtype?: string;
}

function urgencyOf(u: Understood) {
  if (u.dayWord === "Today" || u.dayWord === "Tonight") return "today";
  if (u.date) return "week";
  return undefined;
}

/** Answers for one kind's schema from what the sentence literally said. */
export function prefillFor(u: Understood, kind: DraftKind = u.kind): Prefill {
  const v: Values = {};
  if (kind === "activity") {
    const subtype = u.subtype ?? "other";
    Object.assign(v, {
      title: u.title,
      description: u.description,
      level: u.level,
      size: u.people ? { max: u.people } : undefined,
      date: u.date,
      start: u.start,
      end: u.end,
      area: u.area,
      setting: u.setting,
    });
    return finish({ kind, draftKey: `activity-${subtype}`, schema: activitySchema(subtype), values: v, href: "/activities/new?step=details", subtype });
  }
  if (kind === "project") {
    Object.assign(v, { title: u.title, goal: u.description });
    return finish({ kind, draftKey: "project", schema: PROJECT_SCHEMA, values: v, href: "/projects/new" });
  }
  const needKind = u.needKind ?? "other";
  if (kind === "offer") {
    Object.assign(v, { title: u.title, details: u.description, area: u.area });
    return finish({ kind, draftKey: `offer-${needKind}`, schema: offerSchema(needKind), values: v, href: `/offers/new?kind=${needKind}` });
  }
  Object.assign(v, { title: u.title, details: u.description, urgency: urgencyOf(u), area: u.area });
  if (needKind === "moving" && u.people) v.helpers = u.people;
  return finish({ kind, draftKey: `need-${needKind}`, schema: needSchema(needKind), values: v, href: `/needs/new?kind=${needKind}` });
}

function finish(p: Omit<Prefill, "filled">): Prefill {
  const values = Object.fromEntries(Object.entries(p.values).filter(([, x]) => !isEmpty(x)));
  return { ...p, values, filled: Object.keys(values) };
}

/** First step with something missing, else "review" — where "Preview & approve" lands. */
export function firstGap(schema: Schema, v: Values): string {
  for (const s of visibleSteps(schema, v)) if (visibleFields(s, v).some((f) => problem(f, v[f.id]))) return s.id;
  return "review";
}

/** Writes the pre-fill into the intake's autosaved draft (answers already there win only where
 *  Jenny had nothing) and remembers which fields she filled. */
export function applyPrefill(p: Prefill) {
  try {
    const raw = localStorage.getItem(`arena_intake_${p.draftKey}`);
    const existing = raw ? (JSON.parse(raw) as Values) : {};
    localStorage.setItem(`arena_intake_${p.draftKey}`, JSON.stringify({ ...existing, ...p.values }));
    localStorage.setItem(filledKey(p.draftKey), JSON.stringify(p.filled));
    if (p.kind === "activity" && p.subtype) localStorage.setItem(ACTIVITY_KIND_KEY, p.subtype);
  } catch {
    /* storage blocked — the intake simply starts empty */
  }
}

export function readJennyFilled(draftKey: string): string[] {
  try {
    const raw = localStorage.getItem(filledKey(draftKey));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
export function writeJennyFilled(draftKey: string, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(filledKey(draftKey), JSON.stringify(ids));
    else localStorage.removeItem(filledKey(draftKey));
  } catch {
    /* storage blocked */
  }
}

export const KIND_LABEL: Record<DraftKind, string> = { ask: "Need", offer: "Offer", activity: "Activity", project: "Project" };

/** What's still needed before publishing, in the board's words ("add a time", "confirm capacity"). */
export function nudgeFor(p: Prefill): { add: string[]; confirm: string[] } {
  const v = p.values;
  const add: string[] = [];
  const confirm: string[] = [];
  if (p.kind === "activity") {
    if (!v.date) add.push("a date");
    if (!v.start) add.push("a time");
    if (!v.size) add.push("capacity");
    else confirm.push("capacity");
    if (!v.area) add.push("an area");
  } else if (p.kind === "project") {
    if (!v.goal) add.push("the goal");
    add.push("the roles you need");
  } else {
    if (!v.area) add.push("an area");
    if (p.kind === "offer") add.push("the days you're free");
  }
  return { add, confirm };
}

export function nudgeLine({ add, confirm }: { add: string[]; confirm: string[] }) {
  const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const parts = [add.length ? `add ${list(add)}` : "", confirm.length ? `confirm ${list(confirm)}` : ""].filter(Boolean);
  return parts.length ? `Please ${parts.join(" and ")} before publishing.` : "";
}

export function subtypeLabel(id?: string) {
  return findSubtype(id)?.label;
}
