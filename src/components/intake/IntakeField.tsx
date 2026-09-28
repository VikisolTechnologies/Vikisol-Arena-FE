"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, m, useAnimate, useReducedMotion } from "motion/react";
import { Check, ChevronDown, FileUp, ImagePlus, Lock, MapPin, Minus, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipPop, errorIn, jennyGlow, shake, spring } from "@/lib/motion";
import { PaperSwitch } from "@/components/settings/SettingsSheets";
import { VISIBILITY_LABEL, type Field, type MoneyRange, type Proficiency, type SkillEntry, type Values } from "@/lib/intake/types";

export interface PhotoValue {
  url: string;
  file?: File;
}

const box = "rounded-button border bg-white text-paper-ink outline-none transition-colors duration-200 focus-within:border-primary-on-paper";
const inputCls = "h-[52px] w-full rounded-button border border-field-line bg-white px-4 text-[16px] text-paper-ink outline-none placeholder:text-paper-ink-muted focus:border-primary-on-paper";

/** One intake question: label, why, visibility lock, "Jenny filled" marker, the control, error. */
export function IntakeField({
  field: f,
  value,
  onChange,
  onBlur,
  error,
  shakeSignal,
  jenny,
  all = {},
}: {
  all?: Values;
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  error: string;
  shakeSignal: number;
  jenny: boolean;
}) {
  const id = useId();
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (shakeSignal > 0 && error && !reduced && scope.current) void animate(scope.current, { x: shake.x }, shake.transition);
    // Only a new attempt shakes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeSignal]);

  const describedBy = [f.why && `${id}-why`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const labelEl = (
    <div className="mb-2">
      <label htmlFor={`${id}-c`} id={`${id}-l`} className="block text-[16px] font-semibold">
        {f.label}
        {!f.required && f.type !== "toggle" && f.type !== "stepper" && <span className="font-normal text-paper-ink-muted"> (optional)</span>}
      </label>
      {f.why && <p id={`${id}-why`} className="text-[13px] text-paper-ink-muted">{f.why}</p>}
      {f.visibility && f.visibility !== "public" && (
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-paper-muted px-2 py-0.5 text-[12px] font-medium">
          <Lock className="size-3" aria-hidden /> {VISIBILITY_LABEL[f.visibility]}
        </span>
      )}
    </div>
  );

  return (
    <div ref={scope} className="relative" onBlur={onBlur}>
      {jenny && (
        <>
          <m.span aria-hidden className="pointer-events-none absolute -inset-2 rounded-tile ring-2 ring-primary/60" {...jennyGlow} />
          <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-semibold text-primary-on-paper">
            <Sparkles className="size-3" aria-hidden /> Jenny filled — check
          </span>
        </>
      )}
      {f.type !== "toggle" && labelEl}
      <Control f={f} id={id} value={value} onChange={onChange} describedBy={describedBy} invalid={!!error} all={all} />
      <AnimatePresence initial={false}>
        {error && (
          <m.p key="e" id={`${id}-err`} variants={errorIn} initial="hidden" animate="shown" exit="hidden" className="mt-1.5 text-[13px] text-danger-on-paper">
            {error}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipButton({ on, children, onClick, role }: { on: boolean; children: ReactNode; onClick: () => void; role: "radio" | "checkbox" }) {
  return (
    <m.button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      animate={on ? chipPop : { scale: 1 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      className={cn("relative inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", on ? "border-primary-on-paper bg-primary/10 font-semibold" : "border-field-line bg-white")}
    >
      {on && <Check className="size-4 text-primary-on-paper" strokeWidth={2.5} aria-hidden />}
      {children}
    </m.button>
  );
}

const PROF: { value: Proficiency; label: string }[] = [
  { value: "learning", label: "Learning" },
  { value: "working", label: "Working" },
  { value: "strong", label: "Strong" },
  { value: "expert", label: "Expert" },
];

function Control({ f, id, value, onChange, describedBy, invalid, all }: { f: Field; id: string; value: unknown; onChange: (v: unknown) => void; describedBy?: string; invalid: boolean; all: Values }) {
  const cid = `${id}-c`;
  const aria = { "aria-describedby": describedBy, "aria-invalid": invalid || undefined } as const;
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  switch (f.type) {
    case "chips":
      return (
        <div role="radiogroup" aria-labelledby={`${id}-l`} {...aria} className="flex flex-wrap gap-2">
          {f.options.map((o) => (
            <ChipButton key={o.value} role="radio" on={value === o.value} onClick={() => onChange(o.value)}>
              {o.label}
            </ChipButton>
          ))}
        </div>
      );
    case "multichips": {
      const arr = (value as string[] | undefined) ?? [];
      return (
        <div role="group" aria-labelledby={`${id}-l`} {...aria} className="flex flex-wrap gap-2">
          {f.options.map((o) => {
            const on = arr.includes(o.value);
            return (
              <ChipButton key={o.value} role="checkbox" on={on} onClick={() => onChange(on ? arr.filter((x) => x !== o.value) : f.max && arr.length >= f.max ? arr : [...arr, o.value])}>
                {o.label}
              </ChipButton>
            );
          })}
        </div>
      );
    }
    case "text":
    case "area":
    case "point": {
      const Icon = f.type === "area" ? MapPin : f.type === "point" ? Lock : null;
      return (
        <div className={cn(box, "flex h-[52px] items-center", invalid ? "border-danger-on-paper" : "border-field-line")}>
          {Icon && <Icon className="ml-4 size-5 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />}
          <input id={cid} {...aria} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} maxLength={f.type === "text" ? f.maxLength ?? 120 : 120} inputMode={f.type === "text" ? f.inputMode : undefined} className={cn("h-full min-w-0 flex-1 bg-transparent pr-4 text-[16px] outline-none placeholder:text-paper-ink-muted", Icon ? "pl-3" : "pl-4")} />
        </div>
      );
    }
    case "longtext":
      return (
        <div className={cn(box, invalid ? "border-danger-on-paper" : "border-field-line")}>
          <textarea id={cid} {...aria} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} maxLength={f.maxLength} rows={3} placeholder={f.placeholder} className="block w-full resize-none bg-transparent px-4 pt-3 text-[16px] leading-relaxed outline-none placeholder:text-paper-ink-muted" />
          <p className="px-4 pb-2 text-right text-[12px] text-paper-ink-muted" aria-hidden>{((value as string) ?? "").length}/{f.maxLength}</p>
        </div>
      );
    case "number":
      return (
        <div className={cn(box, "flex h-[52px] items-center", invalid ? "border-danger-on-paper" : "border-field-line")}>
          <input id={cid} {...aria} inputMode="numeric" value={value == null ? "" : String(value)} onChange={(e) => { const n = e.target.value.replace(/[^\d.]/g, ""); onChange(n === "" ? undefined : Number(n)); }} placeholder={f.placeholder} className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none placeholder:text-paper-ink-muted" />
          {f.unit && <span className="pr-4 text-[15px] text-paper-ink-muted">{f.unit}</span>}
        </div>
      );
    case "stepper": {
      const n = typeof value === "number" ? value : f.default ?? f.min;
      const step = f.step ?? 1;
      return (
        <div className="flex items-center gap-3" role="group" aria-labelledby={`${id}-l`}>
          <button type="button" aria-label={`Fewer — ${f.label}`} disabled={n <= f.min} onClick={() => onChange(Math.max(f.min, n - step))} className="grid size-11 place-items-center rounded-full border border-field-line bg-white disabled:opacity-40"><Minus className="size-5" aria-hidden /></button>
          <output id={cid} aria-live="polite" className="min-w-16 text-center text-[20px] font-semibold">{n}{f.unit ? <span className="ml-1 text-[14px] font-normal text-paper-ink-muted">{f.unit}</span> : null}</output>
          <button type="button" aria-label={`More — ${f.label}`} disabled={n >= f.max} onClick={() => onChange(Math.min(f.max, n + step))} className="grid size-11 place-items-center rounded-full border border-field-line bg-white disabled:opacity-40"><Plus className="size-5" aria-hidden /></button>
        </div>
      );
    }
    case "range":
    case "money": {
      const r = (value as MoneyRange | undefined) ?? {};
      const set = (k: "min" | "max", raw: string) => {
        const n = raw.replace(/[^\d.]/g, "");
        onChange({ ...r, [k]: n === "" ? undefined : Number(n) });
      };
      const two = f.type === "range" || f.range;
      const unit = f.unit;
      return (
        <div className={cn("grid items-center gap-2", two ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-1")}>
          <div className={cn(box, "flex h-[52px] items-center border-field-line")}>
            <input id={cid} {...aria} aria-label={two ? `${f.label} — from` : undefined} inputMode="numeric" value={r.min ?? ""} onChange={(e) => set("min", e.target.value)} placeholder={two ? "From" : f.placeholder} className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none placeholder:text-paper-ink-muted" />
            {unit && <span className="pr-3 text-[14px] text-paper-ink-muted">{unit}</span>}
          </div>
          {two && (
            <>
              <span className="text-paper-ink-muted" aria-hidden>–</span>
              <div className={cn(box, "flex h-[52px] items-center border-field-line")}>
                <input aria-label={`${f.label} — to`} inputMode="numeric" value={r.max ?? ""} onChange={(e) => set("max", e.target.value)} placeholder="To" className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none placeholder:text-paper-ink-muted" />
                {unit && <span className="pr-3 text-[14px] text-paper-ink-muted">{unit}</span>}
              </div>
            </>
          )}
        </div>
      );
    }
    case "date":
    case "time":
      return <input id={cid} {...aria} type={f.type} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, invalid && "border-danger-on-paper")} />;
    case "select":
      return (
        <div className={cn(box, "relative flex h-[52px] items-center", invalid ? "border-danger-on-paper" : "border-field-line")}>
          <select id={cid} {...aria} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className={cn("h-full w-full appearance-none bg-transparent pl-4 pr-11 text-[16px] outline-none", value ? "" : "text-paper-ink-muted")}>
            <option value="">{f.placeholder ?? "Choose one"}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 size-5 text-paper-ink-muted" aria-hidden />
        </div>
      );
    case "toggle":
      return (
        <div className="rounded-tile bg-white px-4 ring-1 ring-paper-ink/10">
          <PaperSwitch label={f.label} detail={f.why} checked={value === true} onChange={onChange} />
        </div>
      );
    case "list": {
      const arr = (value as string[] | undefined) ?? [];
      const add = () => {
        const v = draft.trim();
        if (!v || arr.includes(v) || (f.max && arr.length >= f.max)) return setDraft("");
        onChange([...arr, v]);
        setDraft("");
      };
      return (
        <div>
          {arr.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2" aria-labelledby={`${id}-l`}>
              {arr.map((v) => (
                <li key={v} className="inline-flex h-9 max-w-full items-center gap-1 rounded-full bg-white pl-3.5 pr-1 text-[14px] ring-1 ring-paper-ink/15">
                  <span className="truncate">{v}</span>
                  <button type="button" onClick={() => onChange(arr.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-paper-muted"><X className="size-3.5" aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input id={cid} {...aria} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={f.itemPlaceholder ?? f.placeholder} inputMode={f.inputMode} maxLength={120} className={inputCls} />
            <button type="button" onClick={add} aria-label={`Add — ${f.label}`} className="grid size-[52px] shrink-0 place-items-center rounded-button border border-field-line bg-white"><Plus className="size-5" aria-hidden /></button>
          </div>
        </div>
      );
    }
    case "skills": {
      const arr = (value as SkillEntry[] | undefined) ?? [];
      const add = (name: string) => {
        const v = name.trim();
        if (!v || arr.some((s) => s.name.toLowerCase() === v.toLowerCase()) || (f.max && arr.length >= f.max)) return setDraft("");
        onChange([...arr, { name: v, level: "working", years: 1 }]);
        setDraft("");
      };
      const update = (i: number, patch: Partial<SkillEntry>) => onChange(arr.map((s, j) => (j === i ? { ...s, ...patch } : s)));
      const pool = typeof f.suggestions === "function" ? f.suggestions(all) : f.suggestions ?? [];
      const suggestions = pool.filter((s) => !arr.some((x) => x.name.toLowerCase() === s.toLowerCase())).slice(0, 8);
      return (
        <div>
          <ul className="space-y-2.5" aria-labelledby={`${id}-l`}>
            {arr.map((s, i) => (
              <li key={s.name} className="rounded-tile bg-white p-3 ring-1 ring-paper-ink/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold">{s.name}</span>
                  <button type="button" onClick={() => onChange(arr.filter((_, j) => j !== i))} aria-label={`Remove ${s.name}`} className="-mr-1 grid size-9 place-items-center rounded-full hover:bg-paper-muted"><X className="size-4" aria-hidden /></button>
                </div>
                <div role="radiogroup" aria-label={`${s.name} — proficiency`} className="mt-2 grid grid-cols-4 gap-1">
                  {PROF.map((p) => (
                    <button key={p.value} type="button" role="radio" aria-checked={s.level === p.value} onClick={() => update(i, { level: p.value })} className={cn("min-h-10 rounded-full text-[13px] font-semibold", s.level === p.value ? "bg-primary text-paper-ink" : "bg-paper-muted")}>{p.label}</button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[14px]">
                  <span className="text-paper-ink-muted">Years</span>
                  <button type="button" aria-label={`Fewer years — ${s.name}`} disabled={s.years <= 0} onClick={() => update(i, { years: Math.max(0, s.years - 1) })} className="grid size-9 place-items-center rounded-full border border-field-line disabled:opacity-40"><Minus className="size-4" aria-hidden /></button>
                  <span className="w-6 text-center font-semibold" aria-live="polite">{s.years}</span>
                  <button type="button" aria-label={`More years — ${s.name}`} onClick={() => update(i, { years: Math.min(40, s.years + 1) })} className="grid size-9 place-items-center rounded-full border border-field-line"><Plus className="size-4" aria-hidden /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className={cn("flex gap-2", arr.length && "mt-2.5")}>
            <input id={cid} {...aria} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} placeholder={f.placeholder ?? "Add a skill"} maxLength={40} className={inputCls} />
            <button type="button" onClick={() => add(draft)} aria-label={`Add skill`} className="grid size-[52px] shrink-0 place-items-center rounded-button border border-field-line bg-white"><Plus className="size-5" aria-hidden /></button>
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => add(s)} className="min-h-11 rounded-full border border-dashed border-field-line px-3 text-[14px]">+ {s}</button>
              ))}
            </div>
          )}
        </div>
      );
    }
    case "photos": {
      const arr = (value as PhotoValue[] | undefined) ?? [];
      const max = f.max ?? 4;
      return (
        <div className="grid grid-cols-2 gap-3">
          {arr.map((p, i) => (
            <div key={p.url} className="relative aspect-[4/3] overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
              <button type="button" onClick={() => { URL.revokeObjectURL(p.url); onChange(arr.filter((x) => x !== p)); }} aria-label={`Remove photo ${i + 1}`} className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-paper-ink/70 text-white"><X className="size-4" aria-hidden /></button>
            </div>
          ))}
          {arr.length < max && (
            <button id={cid} type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-field-line text-[14px] text-paper-ink-muted">
              <ImagePlus className="size-6" strokeWidth={1.75} aria-hidden /> Add photo
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const files = Array.from(e.target.files ?? []).filter((x) => x.type.startsWith("image/") && x.size <= 10 * 1024 * 1024); onChange([...arr, ...files.map((file) => ({ url: URL.createObjectURL(file), file }))].slice(0, max)); e.target.value = ""; }} />
        </div>
      );
    }
    case "file": {
      const file = value as File | undefined;
      return (
        <>
          <button id={cid} type="button" onClick={() => fileRef.current?.click()} className="flex min-h-16 w-full items-center gap-3 rounded-button border border-dashed border-field-line bg-white px-4 text-left">
            <FileUp className="size-6 shrink-0 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{file?.name ?? f.placeholder ?? "Choose a file"}</span>
              {f.hint && <span className="block text-[13px] text-paper-ink-muted">{f.hint}</span>}
            </span>
          </button>
          <input ref={fileRef} type="file" accept={f.accept} hidden onChange={(e) => { onChange(e.target.files?.[0] ?? undefined); e.target.value = ""; }} />
        </>
      );
    }
  }
}
