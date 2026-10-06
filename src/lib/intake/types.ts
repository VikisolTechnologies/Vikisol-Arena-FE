/**
 * The intake engine (ARENA-APP-FLOW §2): every "create" and "set up" flow is a schema, rendered by
 * one IntakeForm. Adding an activity type means adding a schema, not a screen.
 */

/** Who can see an answer. Every private field shows a lock and this label. */
export type Visibility = "public" | "after-approval" | "employers-i-apply" | "only-me" | "host-after-approval";

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  public: "Public",
  "after-approval": "After approval",
  "employers-i-apply": "Only employers I apply to",
  "only-me": "Only me",
  "host-after-approval": "Only the host, after approval",
};

export type Option = { value: string; label: string; detail?: string };

export type Proficiency = "learning" | "working" | "strong" | "expert";
export interface SkillEntry {
  name: string;
  level: Proficiency;
  years: number;
}
export interface MoneyRange {
  min?: number;
  max?: number;
}

export type Values = Record<string, unknown>;

interface Base {
  id: string;
  label: string;
  /** One line on why we ask ("Helps players know what to bring"). */
  why?: string;
  required?: boolean;
  visibility?: Visibility;
  /** Show this field only when the answers so far make it relevant. */
  showIf?: (v: Values) => boolean;
  placeholder?: string;
  /** Behind "Add more details" — depth that isn't needed to publish. */
  more?: boolean;
}

export type Field =
  | (Base & { type: "chips"; options: readonly Option[]; default?: string })
  | (Base & { type: "multichips"; options: readonly Option[]; max?: number; default?: string[] })
  | (Base & { type: "text"; maxLength?: number; default?: string; inputMode?: "text" | "url" | "email" | "tel" | "numeric" })
  | (Base & { type: "longtext"; maxLength: number; default?: string })
  | (Base & { type: "number"; min?: number; max?: number; unit?: string; default?: number })
  | (Base & { type: "stepper"; min: number; max: number; step?: number; unit?: string; default?: number })
  | (Base & { type: "range"; min: number; max: number; unit?: string; default?: MoneyRange })
  | (Base & { type: "money"; unit: string; range?: boolean; default?: MoneyRange })
  | (Base & { type: "date"; default?: string })
  | (Base & { type: "time"; default?: string })
  | (Base & { type: "select"; options: readonly Option[]; default?: string })
  | (Base & { type: "toggle"; default?: boolean })
  | (Base & { type: "list"; max?: number; itemPlaceholder?: string; inputMode?: "text" | "url"; default?: string[] })
  | (Base & { type: "skills"; max?: number; suggestions?: readonly string[] | ((v: Values) => readonly string[]); default?: SkillEntry[] })
  | (Base & { type: "area"; default?: string })
  | (Base & { type: "point"; default?: string })
  | (Base & { type: "photos"; max?: number })
  | (Base & { type: "file"; accept: string; hint?: string });

export interface Step {
  id: string;
  title: string;
  lede?: string;
  /** At most 4 visible questions per step (§2) — enforced in development. */
  fields: Field[];
  /** Hide a whole step when it doesn't apply. */
  showIf?: (v: Values) => boolean;
}

export interface Schema {
  id: string;
  title: string;
  steps: Step[];
  /** Label for the final button on the review screen. */
  submitLabel: string;
}

export function defaultsOf(schema: Schema): Values {
  const v: Values = {};
  for (const s of schema.steps) for (const f of s.fields) if ("default" in f && f.default !== undefined) v[f.id] = f.default;
  return v;
}

export function visibleSteps(schema: Schema, v: Values) {
  return schema.steps.filter((s) => (!s.showIf || s.showIf(v)) && s.fields.some((f) => !f.showIf || f.showIf(v)));
}
export function visibleFields(step: Step, v: Values) {
  return step.fields.filter((f) => !f.showIf || f.showIf(v));
}

export function isEmpty(value: unknown) {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value as object).every((x) => x == null || x === "");
  return false;
}

/** The first problem with a field's answer, or "". */
export function problem(f: Field, value: unknown): string {
  if (f.required && f.type !== "toggle" && isEmpty(value)) return f.type === "chips" || f.type === "select" || f.type === "multichips" ? "Choose one to continue." : "This one's needed to continue.";
  if (f.type === "toggle" && f.required && value !== true) return "Please confirm to continue.";
  if ((f.type === "number" || f.type === "stepper") && typeof value === "number") {
    if (f.min != null && value < f.min) return `At least ${f.min}.`;
    if (f.max != null && value > f.max) return `At most ${f.max}.`;
  }
  if ((f.type === "money" || f.type === "range") && value && typeof value === "object") {
    const { min, max } = value as MoneyRange;
    if (min != null && max != null && max < min) return "The top of the range must be at least the bottom.";
  }
  if (f.type === "text" && f.inputMode === "url" && typeof value === "string" && value && !/^https:\/\/\S+\.\S+/.test(value)) return "Use a full https:// link.";
  if (f.type === "list" && f.inputMode === "url" && Array.isArray(value) && value.some((x) => !/^https:\/\/\S+\.\S+/.test(String(x)))) return "Each link must start with https://";
  return "";
}

/** A short human summary of an answer for the review screen. */
export function summarize(f: Field, value: unknown): string {
  if (isEmpty(value)) return "—";
  const label = (opts: readonly Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;
  switch (f.type) {
    case "chips":
    case "select":
      return label(f.options, String(value));
    case "multichips":
      return (value as string[]).map((x) => label(f.options, x)).join(", ");
    case "toggle":
      return value ? "Yes" : "No";
    case "money":
    case "range": {
      const { min, max } = value as MoneyRange;
      const u = f.unit ?? "";
      return min != null && max != null ? `${min}–${max} ${u}`.trim() : `${min ?? max} ${u}`.trim();
    }
    case "number":
    case "stepper":
      return `${value}${f.unit ? ` ${f.unit}` : ""}`;
    case "skills":
      return (value as SkillEntry[]).map((s) => `${s.name} (${s.level}${s.years ? `, ${s.years}y` : ""})`).join(", ");
    case "list":
      return (value as string[]).join(", ");
    case "photos":
      return `${(value as unknown[]).length} photo${(value as unknown[]).length === 1 ? "" : "s"}`;
    case "file":
      return (value as File).name ?? "Attached";
    default:
      return String(value);
  }
}
