"use client";

import { useMemo, useState } from "react";
import { m } from "motion/react";
import { ChevronDown, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, rise, spring } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { ButtonLink } from "@/components/bplus/Button";
import { RowCard } from "@/components/cards/FeedCards";
import { JennyByline } from "@/components/jenny/JennyParts";
import { ALL_SUBTYPES, findSubtype, guessType } from "@/lib/activities/taxonomy";
import { LAUNCH_ZONE, distanceKm, type FeedItem, type Origin } from "@/lib/data/feed";
import type { Understood } from "@/lib/jenny/understand";

type When = "any" | "today" | "weekend" | "week" | "date";
type Level = "any" | "beginner" | "intermediate" | "advanced";
type Setting = "either" | "indoor" | "outdoor";
interface Intent {
  subtype: string | null;
  level: Level;
  when: When;
  date?: string;
  radius: number | null;
  setting: Setting;
}

const WHEN_LABEL: Record<When, string> = { any: "Any time", today: "Today", weekend: "This weekend", week: "This week", date: "That day" };
const LEVEL_LABEL: Record<Level, string> = { any: "Any level", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const SETTING_LABEL: Record<Setting, string> = { either: "Indoor/Outdoor", indoor: "Indoor", outdoor: "Outdoor" };
const LEVEL_WORDS = ["beginner", "intermediate", "advanced"];

/** An intent the words can carry: an activity type, or a level/day for an activity. */
export function intentFrom(u: Understood | null): Intent | null {
  if (!u || u.kind !== "activity" || (!u.subtype && !u.level && !u.dayWord)) return null;
  const when: When = u.dayWord === "This weekend" ? "weekend" : u.dayWord === "Today" || u.dayWord === "Tonight" ? "today" : u.date ? "date" : "any";
  return { subtype: u.subtype ?? null, level: u.level && u.level !== "all-levels" ? u.level : "any", when, date: u.date, radius: LAUNCH_ZONE.radiusKm, setting: u.setting ?? "either" };
}

function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function matches(i: FeedItem, it: Intent, origin: Origin) {
  if (i.itemType !== "activity" || ["closed", "cancelled", "expired"].includes(i.status)) return false;
  const hay = `${i.title ?? ""} ${i.body} ${i.tags.join(" ")}`.toLowerCase();
  if (it.subtype) {
    const sub = findSubtype(it.subtype)!;
    if (guessType(i).subtype.id !== it.subtype && !hay.includes(sub.label.toLowerCase())) return false;
  }
  if (it.level !== "any" && LEVEL_WORDS.some((w) => w !== it.level && hay.includes(w)) && !hay.includes(it.level) && !hay.includes("all levels")) return false;
  if (it.setting !== "either" && hay.includes(it.setting === "indoor" ? "outdoor" : "indoor")) return false;
  if (it.radius != null) {
    const km = distanceKm(origin, { lat: i.approxLat, lng: i.approxLng });
    if (km == null || km > it.radius) return false;
  }
  if (it.when !== "any") {
    if (!i.startsAt) return false;
    const t = Date.parse(i.startsAt);
    const days = (t - Date.now()) / 86_400_000;
    const d = new Date(t);
    if (it.when === "today" && d.toDateString() !== new Date().toDateString()) return false;
    if (it.when === "week" && (days < -0.2 || days > 7)) return false;
    if (it.when === "weekend" && (!(d.getDay() === 0 || d.getDay() === 6) || days < -0.2 || days > 7)) return false;
    if (it.when === "date" && it.date && localDay(i.startsAt) !== it.date) return false;
  }
  return true;
}

/**
 * VNext AI-layer board #2 — Discover: "Jenny understood your request". The words become editable
 * filters (type, level, when, distance, setting); results are every nearby activity that passes
 * them, soonest first. "Why these results?" says exactly how. Preview only (FE-API-GAPS #42).
 */
export function IntentResults({ query, initial, items, origin, area, onPlain }: { query: string; initial: Intent; items: FeedItem[]; origin: Origin; area: string; onPlain: () => void }) {
  const [it, setIt] = useState<Intent>(initial);
  const [edit, setEdit] = useState<null | "subtype" | "level" | "when" | "radius" | "setting">(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const results = useMemo(() => items.filter((i) => matches(i, it, origin)).sort((a, b) => Date.parse(a.startsAt ?? "") - Date.parse(b.startsAt ?? "")), [items, it, origin]);
  const sub = findSubtype(it.subtype ?? undefined);
  const siblings = sub ? ALL_SUBTYPES.filter((s) => s.category.id === sub.category.id) : ALL_SUBTYPES.filter((s) => s.category.id === "sports");

  const chip = (key: NonNullable<typeof edit>, label: string, value: string) => (
    <m.button type="button" whileTap={press} transition={spring.snappy} onClick={() => setEdit(key)} aria-label={`${label || value}: ${value}. Change`} className="flex min-h-12 min-w-0 flex-col justify-center rounded-xl border border-paper-ink/20 bg-white px-2.5 py-1.5 text-left">
      {label ? (
        <>
          <span className="flex items-center justify-between gap-1 text-[12px] text-paper-ink-muted">
            {label} <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          </span>
          <span className="block text-[13px] font-semibold leading-tight">{value}</span>
        </>
      ) : (
        <span className="flex items-center justify-between gap-1 text-[14px] font-semibold">
          {value} <ChevronDown className="size-4 shrink-0 text-paper-ink-muted" aria-hidden />
        </span>
      )}
    </m.button>
  );

  const options: Record<NonNullable<typeof edit>, { title: string; items: { id: string; label: string }[]; value: string; set: (id: string) => void }> = {
    subtype: { title: "Activity", items: [{ id: "", label: "Any activity" }, ...siblings.map((s) => ({ id: s.id, label: s.label }))], value: it.subtype ?? "", set: (id) => setIt((x) => ({ ...x, subtype: id || null })) },
    level: { title: "Skill level", items: (Object.keys(LEVEL_LABEL) as Level[]).map((id) => ({ id, label: LEVEL_LABEL[id] })), value: it.level, set: (id) => setIt((x) => ({ ...x, level: id as Level })) },
    when: { title: "When", items: (["any", "today", "weekend", "week"] as When[]).map((id) => ({ id, label: WHEN_LABEL[id] })).concat(it.date ? [{ id: "date", label: new Date(`${it.date}T00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) }] : []), value: it.when, set: (id) => setIt((x) => ({ ...x, when: id as When })) },
    radius: { title: "Distance", items: [{ id: "5", label: "Nearby (5 km)" }, { id: "10", label: "Within 10 km" }, { id: "", label: "Any distance" }], value: it.radius == null ? "" : String(it.radius), set: (id) => setIt((x) => ({ ...x, radius: id ? Number(id) : null })) },
    setting: { title: "Indoor or outdoor", items: (Object.keys(SETTING_LABEL) as Setting[]).map((id) => ({ id, label: id === "either" ? "Either" : SETTING_LABEL[id] })), value: it.setting, set: (id) => setIt((x) => ({ ...x, setting: id as Setting })) },
  };
  const open = edit ? options[edit] : null;

  return (
    <m.div initial="hidden" animate="shown" className="mt-5">
      <m.section variants={rise} custom={0} data-surface="paper" aria-label="Jenny understood your request" className="rounded-[var(--radius-card)] bg-paper p-3.5 text-paper-ink">
        <JennyByline title="Jenny understood your request" detail="Here are the filters I set. You can edit them anytime." />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {chip("subtype", "Activity", sub?.label ?? "Any")}
          {chip("level", "Skill level", LEVEL_LABEL[it.level].replace(" level", ""))}
          {chip("when", "When", it.when === "date" && it.date ? new Date(`${it.date}T00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : WHEN_LABEL[it.when])}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {chip("radius", "", it.radius == null ? "Any distance" : it.radius <= 5 ? "Nearby" : `${it.radius} km`)}
          {chip("setting", "", SETTING_LABEL[it.setting])}
        </div>
      </m.section>

      <m.div variants={rise} custom={1} className="mt-4 flex flex-wrap items-center justify-between gap-x-3">
        <p className="text-[15px] text-faint" role="status">Showing {results.length} {results.length === 1 ? "result" : "results"} near {area}</p>
        <button type="button" onClick={() => setWhyOpen(true)} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-info-on-dark underline underline-offset-4">
          <CircleHelp className="size-4" aria-hidden /> Why these results?
        </button>
      </m.div>

      {results.length === 0 ? (
        <m.div variants={rise} custom={2} className="mt-2 rounded-[var(--radius-card)] border border-line bg-surface p-5 text-center">
          <p className="font-display-serif text-[21px]">Nothing matches all of that yet</p>
          <p className="mx-auto mt-1 max-w-[34ch] text-[14px] text-faint">Loosen a filter above, or start it yourself — Jenny can draft it from what you typed.</p>
          <ButtonLink href={`/agent/draft?q=${encodeURIComponent(query)}`} className="mt-4">Start it with Jenny</ButtonLink>
        </m.div>
      ) : (
        <ul className="mt-2 space-y-3">
          {results.map((i, n) => (
            <m.li key={i.id} variants={rise} custom={2 + n}>
              <RowCard item={i} />
            </m.li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onPlain} className="mt-4 inline-flex min-h-11 items-center text-[14px] text-faint underline underline-offset-4">
        Search everything for &ldquo;{query}&rdquo; instead
      </button>

      <BottomSheet open={!!open} onClose={() => setEdit(null)} title={open?.title ?? "Filter"}>
        {open && (
          <div>
            <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">{open.title}</h2>
            <ul role="radiogroup" aria-label={open.title} className="mt-3 space-y-1.5">
              {open.items.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={open.value === o.id}
                    onClick={() => {
                      open.set(o.id);
                      setEdit(null);
                    }}
                    className={cn("flex min-h-12 w-full items-center rounded-xl px-4 text-left text-[16px]", open.value === o.id ? "bg-primary/10 font-semibold text-primary-on-paper ring-2 ring-primary-on-paper" : "bg-white ring-1 ring-paper-ink/10")}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={whyOpen} onClose={() => setWhyOpen(false)} title="Why these results">
        <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium">Why these results</h2>
        <p className="mt-2 text-[15px] text-paper-ink-muted">From &ldquo;{query}&rdquo; Jenny set these filters. Every activity that passes all of them is shown, soonest first — never ranked by a score.</p>
        <ul className="mt-3 space-y-2 pl-5 text-[15px]">
          <li className="list-disc">{sub ? `Activity: ${sub.label} (by its type or its words)` : "Any activity"}</li>
          <li className="list-disc">{it.level === "any" ? "Any level" : `${LEVEL_LABEL[it.level]}: activities for another level are left out; ones that don't say are kept`}</li>
          <li className="list-disc">When: {WHEN_LABEL[it.when].toLowerCase()}</li>
          <li className="list-disc">{it.radius == null ? "Any distance" : `Within ${it.radius} km of ${area} (approximate)`}</li>
          <li className="list-disc">{it.setting === "either" ? "Indoor or outdoor" : `${SETTING_LABEL[it.setting]} (unless the post says otherwise)`}</li>
        </ul>
      </BottomSheet>
    </m.div>
  );
}
