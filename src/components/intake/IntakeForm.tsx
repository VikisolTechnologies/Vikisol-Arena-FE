"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ChevronDown, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, pageSlide, spring } from "@/lib/motion";
import { Button } from "@/components/bplus/Button";
import { IntakeField, type PhotoValue } from "@/components/intake/IntakeField";
import { defaultsOf, problem, summarize, visibleFields, visibleSteps, type Schema, type Values } from "@/lib/intake/types";
import { readJennyFilled, writeJennyFilled } from "@/lib/jenny/filled";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

/** Files and object URLs can't be saved as a draft; everything else can. */
function serializable(v: Values): Values {
  const out: Values = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof File !== "undefined" && val instanceof File) continue;
    if (Array.isArray(val) && val.some((x) => x && typeof x === "object" && "url" in (x as object) && String((x as PhotoValue).url).startsWith("blob:"))) continue;
    out[k] = val;
  }
  return out;
}

export function readIntakeDraft(key: string): Values | null {
  try {
    const raw = localStorage.getItem(`arena_intake_${key}`);
    return raw ? (JSON.parse(raw) as Values) : null;
  } catch {
    return null;
  }
}
export function clearIntakeDraft(key: string) {
  try {
    localStorage.removeItem(`arena_intake_${key}`);
    writeJennyFilled(key, []);
  } catch {
    /* storage blocked */
  }
}

/**
 * One renderer for every intake (ARENA-APP-FLOW §2): ≤4 questions per step, progress dots,
 * validation after blur / on Next (one shake), direction-aware slides, autosaved drafts (Back never
 * loses answers), a review screen with edit-from-review, and "Jenny filled — check" markers.
 * Must render client-side only (it reads the draft in its initializer).
 */
export function IntakeForm({
  schema,
  draftKey,
  initial,
  jennyFilled = [],
  onSubmit,
  onExit,
  reviewExtra,
  submitError,
  busy,
  intro,
  submitText,
  tabBar = true,
  startAt,
}: {
  schema: Schema;
  draftKey: string;
  initial?: Values;
  jennyFilled?: string[];
  onSubmit: (values: Values) => void | Promise<void>;
  /** Back from the first step / close. */
  onExit: () => void;
  reviewExtra?: (values: Values) => ReactNode;
  submitError?: string;
  busy?: boolean;
  /** Shown above the first step's questions (e.g. "Or just tell Jenny"). */
  intro?: ReactNode;
  /** The final button's label when it depends on the answers (default: schema.submitLabel). */
  submitText?: (values: Values) => string;
  /** Kept for callers. The button sits in the page flow, under the questions, so the shell's
   *  own padding is what keeps it clear of the tab bar. */
  tabBar?: boolean;
  /** Open on this step id (or "review") — Jenny's "Preview & approve" lands on what's missing. */
  startAt?: string;
}) {
  const keyboard = useKeyboardInset();
  const [values, setValues] = useState<Values>(() => ({ ...defaultsOf(schema), ...(initial ?? {}), ...(readIntakeDraft(draftKey) ?? {}) }));
  // Fields Jenny pre-filled stay marked across visits until the person touches them.
  const [jenny, setJenny] = useState<Set<string>>(() => new Set([...jennyFilled, ...readJennyFilled(draftKey)]));
  const [stepIndex, setStepIndex] = useState(() => {
    if (!startAt) return 0;
    const steps = visibleSteps(schema, values);
    return startAt === "review" ? steps.length : Math.max(0, steps.findIndex((s) => s.id === startAt));
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempt, setAttempt] = useState(0);
  const [openMore, setOpenMore] = useState<Set<string>>(new Set());
  const top = useRef<HTMLDivElement>(null);

  // New Jenny pre-fill arriving after mount (e.g. from a sentence) marks those fields.
  const jennyKey = jennyFilled.join("|");
  const [seenJenny, setSeenJenny] = useState(jennyKey);
  if (seenJenny !== jennyKey) {
    setSeenJenny(jennyKey);
    setJenny(new Set(jennyFilled));
  }

  useEffect(() => writeJennyFilled(draftKey, [...jenny]), [jenny, draftKey]);
  useEffect(() => {
    try {
      localStorage.setItem(`arena_intake_${draftKey}`, JSON.stringify(serializable(values)));
    } catch {
      /* storage blocked — still works for this visit */
    }
  }, [values, draftKey]);

  const steps = useMemo(() => visibleSteps(schema, values), [schema, values]);
  const reviewing = stepIndex >= steps.length;
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const fields = step ? visibleFields(step, values) : [];
  if (process.env.NODE_ENV !== "production" && fields.filter((f) => !f.more).length > 4) console.warn(`[intake] ${schema.id}/${step.id} shows more than 4 questions`);

  const set = (id: string, v: unknown) => {
    setValues((cur) => ({ ...cur, [id]: v }));
    if (jenny.has(id)) setJenny((j) => new Set([...j].filter((x) => x !== id)));
  };
  const go = (to: number) => {
    setDirection(to > stepIndex ? 1 : -1);
    setStepIndex(to);
    setAttempt(0);
    top.current?.scrollIntoView({ block: "start" });
  };
  const next = () => {
    const bad = fields.filter((f) => problem(f, values[f.id]));
    if (bad.length) {
      setTouched((t) => new Set([...t, ...bad.map((f) => f.id)]));
      setAttempt((n) => n + 1);
      // Open "more details" if the problem is hidden inside it.
      if (bad.some((f) => f.more)) setOpenMore((s) => new Set([...s, step.id]));
      return;
    }
    go(stepIndex + 1);
  };
  const back = () => (stepIndex === 0 ? onExit() : go(stepIndex - 1));

  const primary = fields.filter((f) => !f.more);
  const extra = fields.filter((f) => f.more);
  const moreOpen = openMore.has(step?.id ?? "");

  return (
    <div ref={top} className="scroll-mt-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} aria-label={stepIndex === 0 ? "Close" : "Back"} className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          {stepIndex === 0 ? <X className="size-6" strokeWidth={1.75} aria-hidden /> : <ArrowLeft className="size-6" strokeWidth={1.75} aria-hidden />}
        </button>
        <ol className="flex items-center gap-1.5" aria-label={reviewing ? "Review" : `Step ${stepIndex + 1} of ${steps.length}`}>
          {[...steps, null].map((s, i) => (
            <li key={s?.id ?? "review"} aria-hidden className="relative h-1.5 w-6 overflow-hidden rounded-full bg-paper-ink/15">
              <m.span className="absolute inset-0 origin-left rounded-full bg-primary-on-paper" initial={false} animate={{ scaleX: i <= stepIndex ? 1 : 0 }} transition={spring.gentle} />
            </li>
          ))}
        </ol>
        <span className="w-11" aria-hidden />
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <m.div key={reviewing ? "review" : step.id} custom={direction} variants={pageSlide} initial="enter" animate="center" exit="exit" className="pt-3">
          {reviewing ? (
            <div>
              <h1 className="font-display-serif text-[28px] font-medium leading-tight">Check your answers</h1>
              <p className="mt-1 text-[15px] text-paper-ink-muted">Tap any section to change it.</p>
              <div className="mt-5 space-y-3">
                {steps.map((s, i) => (
                  <section key={s.id} className="rounded-tile bg-white p-4 ring-1 ring-paper-ink/10" aria-label={s.title}>
                    <div className="flex items-center justify-between">
                      <h2 className="text-[16px] font-semibold">{s.title}</h2>
                      <button type="button" onClick={() => go(i)} className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-primary-on-paper">
                        <Pencil className="size-4" aria-hidden /> Edit<span className="sr-only"> {s.title}</span>
                      </button>
                    </div>
                    <dl className="mt-1 space-y-1.5 text-[14px]">
                      {visibleFields(s, values)
                        .filter((f) => f.type !== "photos" || (values[f.id] as unknown[] | undefined)?.length)
                        .map((f) => (
                          <div key={f.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                            <dt className="text-paper-ink-muted">{f.label}</dt>
                            <dd className="break-words">{summarize(f, values[f.id])}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
              </div>
              {reviewExtra?.(values)}
              {submitError && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{submitError}</p>}
              <div className={cn("mt-6", tabBar && "scroll-mb-28")} style={{ paddingBottom: keyboard || undefined }}>
                <Button loading={busy} onClick={() => onSubmit(values)}>{submitText?.(values) ?? schema.submitLabel}</Button>
              </div>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
            >
              <h1 className="font-display-serif text-[28px] font-medium leading-tight">{step.title}</h1>
              {step.lede && <p className="mt-1 text-[15px] text-paper-ink-muted">{step.lede}</p>}
              {stepIndex === 0 && intro}
              <div className="mt-6 space-y-6">
                {primary.map((f) => (
                  <IntakeField key={f.id} field={f} value={values[f.id]} onChange={(v) => set(f.id, v)} onBlur={() => setTouched((t) => new Set(t).add(f.id))} error={touched.has(f.id) ? problem(f, values[f.id]) : ""} shakeSignal={attempt} jenny={jenny.has(f.id)} all={values} />
                ))}
                {extra.length > 0 && (
                  <div>
                    <button type="button" aria-expanded={moreOpen} onClick={() => setOpenMore((s) => { const n = new Set(s); if (n.has(step.id)) n.delete(step.id); else n.add(step.id); return n; })} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-primary-on-paper">
                      <ChevronDown className={cn("size-5 transition-transform duration-200", moreOpen && "rotate-180")} aria-hidden />
                      {moreOpen ? "Fewer details" : "Add more details"}
                    </button>
                    <AnimatePresence initial={false}>
                      {moreOpen && (
                        <m.div key="more" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={fade} className="mt-4 space-y-6">
                          {extra.map((f) => (
                            <IntakeField key={f.id} field={f} value={values[f.id]} onChange={(v) => set(f.id, v)} onBlur={() => setTouched((t) => new Set(t).add(f.id))} error={touched.has(f.id) ? problem(f, values[f.id]) : ""} shakeSignal={attempt} jenny={jenny.has(f.id)} all={values} />
                          ))}
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <div className={cn("mt-8", tabBar && "scroll-mb-28")} style={{ paddingBottom: keyboard || undefined }}>
                <Button type="submit">{stepIndex === steps.length - 1 ? "Review" : "Continue"}</Button>
              </div>
            </form>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
