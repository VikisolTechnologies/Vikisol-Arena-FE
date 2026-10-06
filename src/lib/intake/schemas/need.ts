import { BookOpen, Car, CircleHelp, Dog, HandHelping, Hammer, Laptop, Lightbulb, PartyPopper, ShoppingBag, Sprout, Truck, type LucideIcon } from "lucide-react";
import type { Field, Option, Schema, Step, Values } from "@/lib/intake/types";

/** ARENA-APP-FLOW §4 — needs (and offers) by category. One schema per category, one renderer. */

const o = (...xs: string[]): Option[] => xs.map((x) => ({ value: x.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: x }));

export interface NeedCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Fields specific to this category (≤4 visible; depth behind "Add more details"). */
  fields: Field[];
  /** A safety line shown with the category, where it matters. */
  safety?: string;
}

export const NEED_KINDS: NeedCategory[] = [
  {
    id: "moving", label: "Moving & heavy lifting", icon: Truck,
    fields: [
      { id: "items", type: "text", label: "What needs moving", required: true, placeholder: "e.g. 3-seater sofa, 4 boxes", maxLength: 100 },
      { id: "helpers", type: "stepper", label: "Helpers needed", min: 1, max: 8, default: 2 },
      { id: "floors", type: "text", label: "Floors and lift", placeholder: "e.g. 3rd floor with lift → ground floor", maxLength: 100, why: "At both ends — people plan their backs around it." },
      { id: "vehicle", type: "toggle", label: "A vehicle is needed", default: false },
      { id: "distanceKm", type: "number", label: "Distance", unit: "km", more: true },
    ],
  },
  {
    id: "tutoring", label: "Tutoring & mentoring", icon: BookOpen,
    fields: [
      { id: "subject", type: "text", label: "Subject", required: true, placeholder: "e.g. Class 10 maths", maxLength: 80 },
      { id: "level", type: "text", label: "Level or grade", maxLength: 40 },
      { id: "mode", type: "chips", label: "How", options: o("In person", "Online"), required: true },
      { id: "often", type: "chips", label: "How often", options: o("Once", "Weekly", "Twice a week") },
    ],
  },
  {
    id: "repairs", label: "Repairs & fixes", icon: Hammer,
    fields: [
      { id: "item", type: "chips", label: "What needs fixing", options: o("Bike", "Appliance", "Furniture", "Electronics", "Other"), required: true },
      { id: "problem", type: "longtext", label: "What's wrong", maxLength: 300, required: true },
      { id: "tools", type: "toggle", label: "I have tools here", default: false },
    ],
  },
  {
    id: "tech", label: "Tech help", icon: Laptop,
    fields: [
      { id: "device", type: "chips", label: "Device", options: o("Phone", "Laptop", "TV", "Wi-Fi", "Other"), required: true },
      { id: "problem", type: "longtext", label: "The problem", maxLength: 300, required: true },
    ],
  },
  { id: "pet-care", label: "Pet care", icon: Dog, fields: [{ id: "pet", type: "text", label: "Pet", placeholder: "e.g. Friendly beagle, 4 years", maxLength: 80, required: true }, { id: "days", type: "text", label: "Days", placeholder: "e.g. 12–14 Oct", maxLength: 60 }] },
  { id: "plant-care", label: "Plant care", icon: Sprout, fields: [{ id: "plants", type: "text", label: "Plants", placeholder: "e.g. Balcony pots, watering", maxLength: 80, required: true }, { id: "days", type: "text", label: "Days", maxLength: 60 }] },
  { id: "errands", label: "Errands", icon: ShoppingBag, fields: [{ id: "errand", type: "text", label: "The errand", placeholder: "e.g. Pick up medicines from the pharmacy", maxLength: 100, required: true }] },
  {
    id: "borrow", label: "Borrow an item", icon: HandHelping,
    fields: [
      { id: "item", type: "text", label: "Item", placeholder: "e.g. Drill, camping tent", maxLength: 80, required: true },
      { id: "howLong", type: "chips", label: "For how long", options: o("A day", "A few days", "A week", "Longer"), required: true },
      { id: "care", type: "text", label: "How you'll look after it", maxLength: 120, more: true },
    ],
  },
  {
    id: "rides", label: "Rides & carpool", icon: Car,
    safety: "Ride with people you've met or who are verified. Pickup points stay private until you accept someone.",
    fields: [
      { id: "from", type: "area", label: "From (area)", required: true, placeholder: "e.g. Gachibowli" },
      { id: "to", type: "area", label: "To (area)", required: true, placeholder: "e.g. Hitech City" },
      { id: "seats", type: "stepper", label: "Seats", min: 1, max: 6, default: 1 },
      { id: "pickup", type: "point", label: "Exact pickup point", visibility: "after-approval" },
    ],
  },
  { id: "advice", label: "Advice & career guidance", icon: Lightbulb, fields: [{ id: "topic", type: "text", label: "Topic", placeholder: "e.g. Switching into UX design", maxLength: 100, required: true }, { id: "format", type: "chips", label: "Format", options: o("Chat", "Call", "Meet") }] },
  { id: "event-help", label: "Event help", icon: PartyPopper, fields: [{ id: "event", type: "text", label: "The event", maxLength: 80, required: true }, { id: "tasks", type: "longtext", label: "What helpers will do", maxLength: 300 }] },
  { id: "other", label: "Something else", icon: CircleHelp, fields: [] },
];

export function findNeedKind(id?: string | null) {
  return NEED_KINDS.find((k) => k.id === id);
}

const URGENCY: Option[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "flexible", label: "Flexible" },
];
const HELP: Option[] = [
  { value: "free", label: "Free" },
  { value: "exchange", label: "Skill exchange" },
  { value: "costs", label: "I'll cover costs" },
];

/** Need schema for a category: basics → category questions → where & photos. */
export function needSchema(kindId: string): Schema {
  const kind = findNeedKind(kindId);
  const steps: Step[] = [
    {
      id: "basics",
      title: "What do you need?",
      lede: "Tell your neighbours — short is fine.",
      fields: [
        { id: "title", type: "text", label: "In one line", required: true, maxLength: 100, placeholder: kind?.id === "moving" ? "e.g. Help move a sofa" : "e.g. Need a hand this weekend" },
        { id: "details", type: "longtext", label: "More details", maxLength: 600 },
        { id: "urgency", type: "chips", label: "When", options: URGENCY, required: true, default: "flexible" },
        { id: "help", type: "chips", label: "Help type", options: HELP, required: true, default: "free", why: "No payments happen in Arena." },
      ],
    },
  ];
  if (kind?.fields.length) steps.push({ id: "specific", title: kind.label, lede: kind.safety, fields: kind.fields });
  steps.push({
    id: "where",
    title: "Where & who sees it",
    fields: [
      { id: "area", type: "area", label: "Area", required: true, placeholder: "e.g. Gachibowli", why: "Only the area is shown — never your address." },
      { id: "audience", type: "chips", label: "Share with", options: [{ value: "global", label: "Anyone on Arena" }, { value: "followers", label: "People who follow me" }], default: "global" },
      { id: "photos", type: "photos", label: "Photos", max: 4, why: "Helps people see what's involved." },
    ],
  });
  return { id: `need-${kindId}`, title: "Post a need", submitLabel: "Post need", steps };
}

/** Offer schema (flow §4 O1): what you can give, when, and your limits. */
export function offerSchema(kindId: string): Schema {
  const kind = findNeedKind(kindId);
  return {
    id: `offer-${kindId}`,
    title: "Make an offer",
    submitLabel: "Post offer",
    steps: [
      {
        id: "what",
        title: "What can you offer?",
        lede: kind ? kind.label : undefined,
        fields: [
          { id: "title", type: "text", label: "In one line", required: true, maxLength: 100, placeholder: "e.g. Maths tutoring for Class 8–10" },
          { id: "details", type: "longtext", label: "What exactly", maxLength: 600, placeholder: "What you do, what you don't" },
          { id: "help", type: "chips", label: "In return", options: [{ value: "free", label: "Free" }, { value: "exchange", label: "Skill exchange" }], required: true, default: "free", why: "No payments happen in Arena." },
          { id: "proof", type: "text", inputMode: "url", label: "Portfolio or proof link", placeholder: "https://…", more: true },
        ],
      },
      {
        id: "when",
        title: "When and how much",
        fields: [
          { id: "days", type: "multichips", label: "Days", options: o("Weekdays", "Weekends", "Evenings"), required: true },
          { id: "limit", type: "chips", label: "Limit", options: o("Once a week", "Twice a week", "A few times a month", "No limit"), default: "twice-a-week", why: "So you never feel overcommitted." },
          { id: "area", type: "area", label: "Area", required: true, placeholder: "e.g. Gachibowli" },
          { id: "audience", type: "chips", label: "Share with", options: [{ value: "global", label: "Anyone on Arena" }, { value: "followers", label: "People who follow me" }], default: "global" },
        ],
      },
    ],
  };
}

export const HELP_LABEL: Record<string, string> = { free: "Free", exchange: "Skill exchange", costs: "Costs covered by the asker" };
export const URGENCY_LABEL: Record<string, string> = { today: "Today", week: "This week", flexible: "Flexible" };

/** Public lines for the post text from a schema's answers (never private fields). */
export function publicLines(schema: Schema, v: Values, stepIds: string[]): string[] {
  const out: string[] = [];
  for (const step of schema.steps.filter((s) => stepIds.includes(s.id))) {
    for (const f of step.fields) {
      if (f.visibility && f.visibility !== "public") continue;
      if (f.showIf && !f.showIf(v)) continue;
      const val = v[f.id];
      if (val == null || val === "" || (Array.isArray(val) && !val.length) || f.type === "photos" || f.type === "longtext") continue;
      const label = (opts: readonly Option[], x: string) => opts.find((p) => p.value === x)?.label ?? x;
      const text = f.type === "chips" ? label(f.options, String(val)) : f.type === "multichips" ? (val as string[]).map((x) => label(f.options, x)).join(", ") : f.type === "toggle" ? (val ? "Yes" : "No") : f.type === "list" ? (val as string[]).join(", ") : `${val}${"unit" in f && f.unit ? ` ${f.unit}` : ""}`;
      out.push(`${f.label}: ${text}`);
    }
  }
  return out;
}
