import type { Field, Option, Schema, Step, Values } from "@/lib/intake/types";
import { findSubtype } from "@/lib/activities/taxonomy";

/** ARENA-APP-FLOW §3 — host an activity. Common questions for every type + per-type questions.
 *  Adding a type = adding an entry to TYPE_FIELDS (and a line in the taxonomy). */

const o = (...xs: string[]): Option[] => xs.map((x) => ({ value: x.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: x }));
const LEVELS = o("Beginner", "Intermediate", "Advanced", "All levels");

export const TYPE_FIELDS: Record<string, Field[]> = {
  cricket: [
    { id: "format", type: "chips", label: "Format", options: o("Box", "Tennis-ball", "Leather-ball", "Nets"), required: true, why: "So people bring the right gear." },
    { id: "overs", type: "chips", label: "Overs", options: o("6", "10", "20", "Custom"), showIf: (v) => v.format !== "nets" },
    { id: "perSide", type: "stepper", label: "Players per side", min: 2, max: 11, default: 8 },
    { id: "equipment", type: "multichips", label: "Equipment provided", options: o("Bat", "Ball", "Stumps", "Pads", "Gloves") },
    { id: "ground", type: "text", label: "Ground booked", placeholder: "e.g. Gachibowli Box Arena", more: true, maxLength: 80 },
  ],
  badminton: [
    { id: "play", type: "chips", label: "Singles or doubles", options: o("Singles", "Doubles", "Both"), required: true },
    { id: "courts", type: "stepper", label: "Courts booked", min: 0, max: 10, default: 1 },
    { id: "shuttle", type: "chips", label: "Shuttle", options: o("Feather", "Nylon") },
    { id: "spareRackets", type: "toggle", label: "Spare rackets available", default: false },
  ],
  football: [
    { id: "aSide", type: "chips", label: "Format", options: o("5-a-side", "7-a-side", "11-a-side"), required: true },
    { id: "turf", type: "toggle", label: "Turf booked", default: false },
    { id: "studs", type: "chips", label: "Studs", options: o("Allowed", "Not allowed") },
  ],
  running: [
    { id: "distance", type: "chips", label: "Distance", options: o("3 km", "5 km", "10 km", "21 km"), required: true },
    { id: "pace", type: "multichips", label: "Pace groups", options: o("Easy", "Steady", "Fast") },
    { id: "route", type: "chips", label: "Route", options: o("Lake", "Road", "Trail") },
    { id: "water", type: "toggle", label: "Water point on the route", default: false },
  ],
  trekking: [
    { id: "difficulty", type: "chips", label: "Difficulty", options: [{ value: "easy", label: "Easy — gentle paths" }, { value: "moderate", label: "Moderate — some climbs" }, { value: "hard", label: "Hard — steep, long" }], required: true, why: "Plain words so people pick well." },
    { id: "distanceKm", type: "number", label: "Distance", unit: "km", min: 1, max: 60 },
    { id: "elevation", type: "number", label: "Elevation gain", unit: "m", more: true },
    { id: "duration", type: "number", label: "Duration", unit: "hours", min: 1, max: 72 },
    { id: "transport", type: "chips", label: "Getting there", options: o("Meet at the trailhead", "Carpool"), more: true },
    { id: "gear", type: "list", label: "Gear list", itemPlaceholder: "e.g. 2 L water", more: true },
    { id: "fitness", type: "text", label: "Fitness note", placeholder: "e.g. Comfortable walking 3 hours", more: true, maxLength: 120 },
  ],
  cycling: [
    { id: "bike", type: "chips", label: "Ride type", options: o("Road", "MTB"), required: true },
    { id: "distanceKm", type: "number", label: "Distance", unit: "km", min: 1, max: 300 },
    { id: "pace", type: "chips", label: "Pace", options: o("Easy", "Steady", "Fast") },
    { id: "helmet", type: "toggle", label: "Helmet required", default: true },
  ],
  yoga: [
    { id: "style", type: "chips", label: "Style", options: o("Hatha", "Vinyasa", "Yin", "Power", "Mixed") },
    { id: "mats", type: "toggle", label: "Mats provided", default: false },
  ],
  workshop: [
    { id: "topic", type: "text", label: "Topic", required: true, maxLength: 80 },
    { id: "materials", type: "text", label: "Materials", placeholder: "Provided / bring your own", maxLength: 120 },
    { id: "mode", type: "chips", label: "Where", options: o("In person", "Online"), required: true },
    { id: "link", type: "text", inputMode: "url", label: "Online link", why: "Shared only after approval.", visibility: "after-approval", showIf: (v) => v.mode === "online", placeholder: "https://…" },
  ],
  "board-games": [
    { id: "games", type: "list", label: "Games", itemPlaceholder: "e.g. Catan" },
    { id: "teamSize", type: "stepper", label: "Players per table", min: 2, max: 10, default: 4 },
  ],
  "quiz-night": [
    { id: "theme", type: "text", label: "Theme", maxLength: 60 },
    { id: "teamSize", type: "stepper", label: "Team size", min: 1, max: 8, default: 4 },
  ],
  potluck: [
    { id: "diet", type: "multichips", label: "Food", options: o("Veg", "Non-veg", "Vegan", "Jain"), required: true },
    { id: "allergens", type: "text", label: "Allergens note", maxLength: 120 },
    { id: "bringDish", type: "toggle", label: "Everyone brings a dish", default: true },
  ],
  "clean-up": [
    { id: "partner", type: "text", label: "Partner group", maxLength: 80 },
    { id: "supplies", type: "toggle", label: "Supplies provided", default: true },
    { id: "tasks", type: "longtext", label: "What volunteers will do", maxLength: 300 },
  ],
};
// Same questions for close cousins.
TYPE_FIELDS.hiking = TYPE_FIELDS.trekking;
TYPE_FIELDS.walking = TYPE_FIELDS.running.filter((f) => f.id !== "pace");
TYPE_FIELDS.volleyball = [{ id: "play", type: "chips", label: "Format", options: o("Beach", "Indoor", "Park"), required: true }, { id: "teamSize", type: "stepper", label: "Players per side", min: 2, max: 6, default: 6 }];
TYPE_FIELDS.basketball = [{ id: "play", type: "chips", label: "Format", options: o("3x3", "5x5"), required: true }, { id: "court", type: "toggle", label: "Court booked", default: false }];
TYPE_FIELDS.tennis = [{ id: "play", type: "chips", label: "Singles or doubles", options: o("Singles", "Doubles"), required: true }, { id: "court", type: "toggle", label: "Court booked", default: false }, { id: "balls", type: "toggle", label: "Balls provided", default: false }];
TYPE_FIELDS["table-tennis"] = TYPE_FIELDS.tennis;
TYPE_FIELDS.pickleball = TYPE_FIELDS.tennis;
TYPE_FIELDS.swimming = [{ id: "pool", type: "text", label: "Pool", maxLength: 80 }, { id: "ability", type: "chips", label: "Swimmers should be", options: o("Beginners welcome", "Confident", "Strong") }];
TYPE_FIELDS["study-group"] = TYPE_FIELDS.workshop;
TYPE_FIELDS["tech-meetup"] = TYPE_FIELDS.workshop;
TYPE_FIELDS["language-exchange"] = [{ id: "languages", type: "list", label: "Languages practised", itemPlaceholder: "e.g. Telugu ↔ English" }];
TYPE_FIELDS["book-club"] = [{ id: "book", type: "text", label: "Book", maxLength: 100 }];
TYPE_FIELDS.chess = [{ id: "format", type: "chips", label: "Format", options: o("Casual", "Rapid", "Blitz") }, { id: "boards", type: "toggle", label: "Boards provided", default: true }];
TYPE_FIELDS["cook-together"] = TYPE_FIELDS.potluck;
TYPE_FIELDS["food-walk"] = [{ id: "diet", type: "multichips", label: "Food", options: o("Veg", "Non-veg", "Vegan", "Jain") }];
TYPE_FIELDS["tree-planting"] = TYPE_FIELDS["clean-up"];
TYPE_FIELDS.volunteering = TYPE_FIELDS["clean-up"];
TYPE_FIELDS["donation-drive"] = [{ id: "items", type: "list", label: "What to donate", itemPlaceholder: "e.g. Books, clothes" }];

const shared = (v: Values) => v.cost === "shared";

export function activitySchema(subtypeId: string): Schema {
  const sub = findSubtype(subtypeId);
  const typeFields = TYPE_FIELDS[subtypeId] ?? [];
  const steps: Step[] = [
    {
      id: "about",
      title: sub ? `${sub.label}: the basics` : "The basics",
      fields: [
        { id: "title", type: "text", label: "Title", required: true, maxLength: 80, placeholder: sub ? `e.g. Sunday ${sub.label.toLowerCase()} at the lake` : "e.g. Sunday morning meet-up" },
        { id: "description", type: "longtext", label: "Short description", maxLength: 400, placeholder: "What to expect, who it's for" },
        { id: "level", type: "chips", label: "Skill level", options: LEVELS, required: true, default: "all-levels" },
      ],
    },
    {
      id: "group",
      title: "Group & cost",
      lede: "No payments happen in Arena.",
      fields: [
        { id: "size", type: "range", label: "Group size", min: 2, max: 200, unit: "people", required: true, why: "Minimum to go ahead, maximum spots." },
        { id: "waitlist", type: "toggle", label: "Waitlist when full", default: true },
        { id: "cost", type: "chips", label: "Cost", options: [{ value: "free", label: "Free" }, { value: "shared", label: "Shared cost" }], required: true, default: "free" },
        { id: "costPer", type: "money", unit: "₹ / person", label: "Shared cost", showIf: shared, required: true },
        { id: "costNote", type: "text", label: "What it covers", placeholder: "e.g. Court booking", showIf: shared, maxLength: 80, more: true },
      ],
    },
  ];
  if (typeFields.length) steps.push({ id: "type", title: sub ? `About the ${sub.label.toLowerCase()}` : "Details", fields: typeFields });
  steps.push(
    {
      id: "bring",
      title: "Before they come",
      fields: [
        { id: "bring", type: "list", label: "What to bring", itemPlaceholder: "e.g. Water bottle", max: 8, why: "Helps people come prepared." },
        { id: "accessNote", type: "text", label: "Accessibility notes", placeholder: "e.g. Step-free entrance, shaded seating", maxLength: 140 },
        { id: "adults", type: "toggle", label: "All joiners are 18+", why: "Arena activities are for adults at launch.", required: true, default: false },
      ],
    },
    {
      id: "when",
      title: "When",
      fields: [
        { id: "date", type: "date", label: "Date", required: true },
        { id: "start", type: "time", label: "Starts", required: true },
        { id: "end", type: "time", label: "Ends" },
        { id: "repeat", type: "chips", label: "Repeats", options: [{ value: "once", label: "One-off" }, { value: "weekly", label: "Weekly" }], default: "once" },
      ],
    },
    {
      id: "where",
      title: "Where",
      fields: [
        { id: "area", type: "area", label: "Area", required: true, placeholder: "e.g. Gachibowli", why: "Public — approximate only." },
        { id: "point", type: "point", label: "Exact meeting point", visibility: "after-approval", placeholder: "e.g. East Gate, near the cycling track", why: "Only people you approve see this." },
        { id: "setting", type: "chips", label: "Indoor or outdoor", options: o("Outdoor", "Indoor") },
      ],
    },
    {
      id: "who",
      title: "Who can join",
      fields: [
        { id: "joining", type: "chips", label: "Joining", options: [{ value: "approval", label: "I approve each request" }, { value: "open", label: "Open — anyone can join" }], required: true, default: "approval" },
        { id: "questions", type: "list", label: "Questions for joiners", max: 3, itemPlaceholder: "e.g. How many overs have you played?", why: "Up to three; you'll see the answers." },
        { id: "womenOnly", type: "toggle", label: "Women-only (label)", why: "A label only — approval is required and nobody is asked their gender.", default: false },
      ],
    },
  );
  return { id: `activity-${subtypeId}`, title: "Create an activity", submitLabel: "Choose a cover", steps };
}

/** The public details that can go in the post today (FE-API-GAPS #23 has the structured fields). */
export function publicDetailLines(schema: Schema, v: Values): string[] {
  const typeStep = schema.steps.find((s) => s.id === "type");
  const out: string[] = [];
  for (const f of typeStep?.fields ?? []) {
    if (f.visibility && f.visibility !== "public") continue;
    const val = v[f.id];
    if (val == null || val === "" || (Array.isArray(val) && !val.length)) continue;
    if (f.showIf && !f.showIf(v)) continue;
    const label = (opts: readonly Option[], x: string) => opts.find((p) => p.value === x)?.label ?? x;
    const text =
      f.type === "chips" ? label(f.options, String(val)) : f.type === "multichips" ? (val as string[]).map((x) => label(f.options, x)).join(", ") : f.type === "toggle" ? (val ? "Yes" : "No") : f.type === "list" ? (val as string[]).join(", ") : `${val}${"unit" in f && f.unit ? ` ${f.unit}` : ""}`;
    out.push(`${f.label}: ${text}`);
  }
  return out;
}
