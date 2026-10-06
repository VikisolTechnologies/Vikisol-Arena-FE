/**
 * Preview-only "understanding" for Jenny's P8 screens: a deterministic, on-device reader of one
 * sentence (no model, no network). It pulls out only what the words literally say — a kind, an
 * activity type, a day, a time, a number of people, a level, a known area — and leaves every
 * other field empty for the person to fill. Real mode waits for the PROPOSED v2 interpret
 * contract (FE-API-GAPS #42); nothing here is used while that's unbuilt.
 */
import { ALL_SUBTYPES } from "@/lib/activities/taxonomy";
import { AREA_CENTRES } from "@/lib/data/feed";

export type DraftKind = "ask" | "offer" | "activity" | "project";

export interface Understood {
  kind: DraftKind;
  /** Activity subtype id (taxonomy) when the words name one. */
  subtype?: string;
  /** Need/offer category id (schemas/need.ts) when the words name one. */
  needKind?: string;
  title: string;
  description: string;
  /** yyyy-mm-dd, local. */
  date?: string;
  /** "Saturday" / "This weekend" — what the person said, for display. */
  dayWord?: string;
  /** HH:MM, 24h. */
  start?: string;
  end?: string;
  /** "two volunteers", "12 players" → 2 / 12. */
  people?: number;
  peopleWord?: string;
  level?: "beginner" | "intermediate" | "advanced" | "all-levels";
  area?: string;
  /** Plain-words place the person named ("Gachibowli Lake"), kept for the description. */
  place?: string;
  setting?: "outdoor" | "indoor";
  tags: string[];
}

const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
const PEOPLE_NOUNS = "people|persons|players|volunteers|helpers|hands|spots|seats|friends|neighbours|neighbors|runners|members";
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Extra words people use for a taxonomy subtype. */
const SYNONYMS: Record<string, string[]> = {
  badminton: ["shuttle"],
  running: ["run", "5k", "10k", "jog"],
  "clean-up": ["cleanup", "clean up", "clean-up"],
  "tree-planting": ["plant trees", "planting"],
  cricket: ["box cricket", "nets"],
  "board-games": ["board game"],
  "book-club": ["book club", "reading group"],
  "music-jam": ["jam session"],
  "photo-walk": ["photowalk", "photo walk"],
  walking: ["walk"],
  cycling: ["ride", "cycle"],
};

/** Need categories by the words that name them (schemas/need.ts ids). */
const NEED_WORDS: [string, RegExp][] = [
  ["moving", /\b(move|moving|shift|sofa|furniture|boxes|carry)\b/],
  ["tutoring", /\b(tutor|tutoring|mentor|maths?|algebra|homework|exam|lesson)\b/],
  ["repairs", /\b(fix|repair|broken|leak)\b/],
  ["tech", /\b(laptop|phone|wi-?fi|printer|computer)\b/],
  ["pet-care", /\b(dog|cat|pet|puppy)\b/],
  ["plant-care", /\b(plants?|watering)\b/],
  ["borrow", /\b(borrow|lend|ladder|drill|tent)\b/],
  ["rides", /\b(ride|lift|carpool|drop me|pick me)\b/],
  ["errands", /\b(errand|pick up|pharmacy|groceries)\b/],
  ["advice", /\b(advice|guidance|career)\b/],
  ["event-help", /\b(event|party|wedding)\b/],
];

const TAGS_FOR: Record<string, string[]> = {
  "clean-up": ["Environment", "Volunteering", "Outdoors"],
  "tree-planting": ["Environment", "Volunteering", "Outdoors"],
  volunteering: ["Volunteering", "Community"],
  badminton: ["Sports", "Indoor"],
  running: ["Fitness", "Outdoors"],
  cricket: ["Sports", "Outdoors"],
};

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function nextDay(now: Date, dow: number, allowToday = false) {
  const d = new Date(now);
  let add = (dow - d.getDay() + 7) % 7;
  if (add === 0 && !allowToday) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function readDate(t: string, now: Date): { date?: string; dayWord?: string } {
  if (/\btoday\b|\btonight\b|\bthis evening\b/.test(t)) return { date: iso(now), dayWord: /tonight/.test(t) ? "Tonight" : "Today" };
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { date: iso(d), dayWord: "Tomorrow" };
  }
  if (/\b(this )?weekend\b/.test(t)) return { date: iso(nextDay(now, 6, true)), dayWord: "This weekend" };
  for (let i = 0; i < DAYS.length; i++) {
    if (new RegExp(`\\b${DAYS[i]}\\b|\\b${DAYS[i].slice(0, 3)}\\b`).test(t)) return { date: iso(nextDay(now, i, true)), dayWord: cap(DAYS[i]) };
  }
  const m = t.match(new RegExp(`\\b(\\d{1,2})\\s*(${MONTHS.join("|")})[a-z]*\\b|\\b(${MONTHS.join("|")})[a-z]*\\s*(\\d{1,2})\\b`));
  if (m) {
    const day = Number(m[1] ?? m[4]);
    const mon = MONTHS.indexOf((m[2] ?? m[3]).slice(0, 3));
    const d = new Date(now.getFullYear(), mon, day);
    if (d.getTime() < now.getTime() - 86_400_000) d.setFullYear(d.getFullYear() + 1);
    return { date: iso(d) };
  }
  return {};
}

function to24(h: number, min: number, mer?: string) {
  let hh = h % 12;
  if (mer === "pm") hh += 12;
  if (!mer) hh = h; // "19:00"
  return `${pad(hh)}:${pad(min)}`;
}

function readTime(t: string): { start?: string; end?: string } {
  // "2-4 pm", "2 to 4pm", "6:30–8 pm"
  const range = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (range) {
    const mer2 = range[6];
    const mer1 = range[3] ?? mer2;
    return { start: to24(Number(range[1]), Number(range[2] ?? 0), mer1), end: to24(Number(range[4]), Number(range[5] ?? 0), mer2) };
  }
  const one = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ?? t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (one) return { start: to24(Number(one[1]), Number(one[2] ?? 0), one[3]) };
  if (/\bnoon\b/.test(t)) return { start: "12:00" };
  return {};
}

function readPeople(t: string): { people?: number; peopleWord?: string } {
  const m = t.match(new RegExp(`\\b(\\d{1,3}|${Object.keys(NUMBER_WORDS).join("|")})\\s+(?:more\\s+)?(?:[a-z-]+\\s+)?(${PEOPLE_NOUNS})\\b`));
  if (!m) return {};
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMBER_WORDS[m[1]];
  return n ? { people: n, peopleWord: m[2] } : {};
}

function readArea(raw: string): { area?: string; place?: string } {
  const lower = raw.toLowerCase();
  for (const key of Object.keys(AREA_CENTRES)) {
    const parts = key.split(/\s*\/\s*/);
    const hit = parts.find((p) => lower.includes(p.toLowerCase()));
    if (hit) {
      const place = raw.match(new RegExp(`${hit}(\\s+(lake|park|stadium|ground|circle|arena|hub))?`, "i"))?.[0];
      return { area: key, place: place ?? hit };
    }
  }
  return {};
}

function readSubtype(t: string) {
  for (const s of ALL_SUBTYPES) {
    const words = [s.label.toLowerCase(), s.id.replace(/-/g, " "), ...(SYNONYMS[s.id] ?? [])];
    if (words.some((w) => new RegExp(`\\b${w.replace(/[-\s]/g, "[-\\s]?")}\\b`).test(t))) return s.id;
  }
  return undefined;
}

/** The time/date/number phrases removed, what's left reads as a short title. */
function titleFrom(raw: string, u: Pick<Understood, "subtype" | "peopleWord" | "kind">) {
  const sub = u.subtype ? ALL_SUBTYPES.find((s) => s.id === u.subtype) : undefined;
  if (sub && u.peopleWord === "volunteers") return `${cap(raw.match(/\blake\b/i) ? `lake ${sub.label.toLowerCase()}` : sub.label)} volunteers`;
  let s = raw
    .replace(/^(i\s+)?(need|want|am looking for|looking for|i'm looking for|can someone|anyone up for|let's have|organise|organize|host)\s+(a|an|some)?\s*/i, "")
    .replace(/\b(this|next|on)?\s*(today|tonight|tomorrow|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)?\s*(-|–|to)?\s*(\d{1,2}(:\d{2})?\s*(am|pm))?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[.,!?]+$/, "");
  if (s.length > 60) s = `${s.slice(0, 57).trimEnd()}…`;
  return cap(s || raw.trim());
}

export function understand(sentence: string, now = new Date()): Understood | null {
  const raw = sentence.trim();
  if (raw.length < 4) return null;
  const t = raw.toLowerCase();
  const subtype = readSubtype(t);
  const { people, peopleWord } = readPeople(t);
  const needKind = NEED_WORDS.find(([, re]) => re.test(t))?.[0];
  const kind: DraftKind = /\b(project|build|campaign)\b/.test(t)
    ? "project"
    : /\b(i can|i'm offering|offering|happy to help|i could)\b/.test(t)
      ? "offer"
      : subtype || peopleWord === "players" || peopleWord === "volunteers"
        ? "activity"
        : needKind || /\b(need|help|anyone|looking for)\b/.test(t)
          ? "ask"
          : "activity";
  const level = /\bbeginner/.test(t) ? "beginner" : /\bintermediate\b/.test(t) ? "intermediate" : /\badvanced\b/.test(t) ? "advanced" : /\ball levels\b/.test(t) ? "all-levels" : undefined;
  const { area, place } = readArea(raw);
  const { date, dayWord } = readDate(t, now);
  const { start, end } = readTime(t);
  const setting = /\b(indoor|court|hall)\b/.test(t) ? "indoor" : /\b(lake|park|outdoor|ground|trail|garden)\b/.test(t) ? "outdoor" : undefined;
  const title = titleFrom(raw, { subtype, peopleWord, kind });
  const bits = [
    people && peopleWord ? `Looking for ${people} ${peopleWord}` : kind === "ask" ? "Looking for a hand" : null,
    subtype ? `for ${ALL_SUBTYPES.find((s) => s.id === subtype)!.label.toLowerCase()}` : null,
    place ? `at ${place}` : null,
    dayWord ? (dayWord === "This weekend" ? "this weekend" : dayWord === "Today" || dayWord === "Tonight" || dayWord === "Tomorrow" ? dayWord.toLowerCase() : `this ${dayWord}`) : null,
  ].filter(Boolean);
  const description = bits.length > 1 ? `${bits.join(" ")}.` : raw.replace(/([^.!?])$/, "$1.");
  const tags = [...(subtype ? TAGS_FOR[subtype] ?? [] : []), ...(level === "beginner" ? ["Beginner"] : [])];
  return {
    kind,
    subtype: kind === "activity" ? subtype : undefined,
    needKind: kind === "ask" || kind === "offer" ? needKind ?? "other" : undefined,
    title,
    description: cap(description),
    date,
    dayWord,
    start,
    end,
    people,
    peopleWord,
    level,
    area,
    place,
    setting,
    tags: [...new Set(tags)],
  };
}
