"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, press, rise, spring } from "@/lib/motion";
import { ALL_SUBTYPES, CATEGORIES, type Category } from "@/lib/activities/taxonomy";

/** Flow §3 A1 — "What kind?": search, category grid, then its types. */
export function KindPicker({ onPick, onClose, intro }: { onPick: (subtypeId: string) => void; onClose: () => void; /** "Or just tell Jenny" (flow §3 A1). */ intro?: ReactNode }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Category | null>(null);
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? ALL_SUBTYPES.filter((s) => s.label.toLowerCase().includes(q) || s.category.label.toLowerCase().includes(q)) : []), [q]);

  return (
    <div>
      <div className="flex justify-end">
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-paper-muted">
          <X className="size-6" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <h1 className="font-display-serif text-[30px] font-medium leading-[1.12]">What kind of activity?</h1>
      <p className="mt-2 text-[15px] text-paper-ink-muted">Pick the closest — the questions adapt to it.</p>
      {intro}
      <label className="mt-5 flex h-[52px] items-center gap-2.5 rounded-full border border-field-line bg-white px-4 focus-within:border-primary-on-paper">
        <Search className="size-5 text-paper-ink-muted" aria-hidden />
        <span className="sr-only">Search activity types</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cricket, yoga, book club…" className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-paper-ink-muted" />
      </label>

      <AnimatePresence mode="wait" initial={false}>
        {q ? (
          <m.ul key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="mt-4 space-y-2" aria-label="Matching types">
            {matches.length === 0 && (
              <li>
                <button type="button" onClick={() => onPick("other")} className="flex min-h-14 w-full items-center gap-3 rounded-tile bg-white px-4 text-left ring-1 ring-paper-ink/10">
                  <span className="flex-1 text-[16px]">Nothing matches — use <strong className="font-semibold">&ldquo;{query.trim()}&rdquo;</strong> as Something else</span>
                </button>
              </li>
            )}
            {matches.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onPick(s.id)} className="flex min-h-14 w-full items-center gap-3 rounded-tile bg-white px-4 text-left ring-1 ring-paper-ink/10">
                  <span className="grid size-10 place-items-center rounded-full text-white" style={{ background: s.category.palette[0] }}><s.icon className="size-5" strokeWidth={1.75} aria-hidden /></span>
                  <span className="flex-1 text-[16px] font-semibold">{s.label}</span>
                  <span className="text-[13px] text-paper-ink-muted">{s.category.label}</span>
                </button>
              </li>
            ))}
          </m.ul>
        ) : (
          <m.div key="grid" initial="hidden" animate="shown" exit={{ opacity: 0 }} className="mt-5 grid grid-cols-3 gap-2.5">
            {CATEGORIES.map((c, i) => {
              const on = open?.id === c.id;
              return (
                <m.button
                  key={c.id}
                  type="button"
                  variants={rise}
                  custom={i}
                  whileTap={press}
                  transition={spring.snappy}
                  aria-expanded={on}
                  onClick={() => (c.id === "other" ? onPick("other") : setOpen(on ? null : c))}
                  className={cn("flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-tile p-2 text-center outline-none ring-offset-2 ring-offset-paper focus-visible:ring-2 focus-visible:ring-primary", on ? "bg-white ring-2 ring-primary-on-paper" : "bg-white ring-1 ring-paper-ink/10")}
                >
                  <span className="grid size-11 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${c.palette[0]}, ${c.palette[1]})` }}>
                    <c.icon className="size-5" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="text-[14px] font-semibold leading-tight">{c.label}</span>
                </m.button>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open && !q && (
          <m.section key={open.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={spring.gentle} className="mt-5" aria-label={`${open.label} types`}>
            <h2 className="text-[17px] font-semibold">{open.label}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {open.subtypes.map((s) => (
                <m.button key={s.id} type="button" whileTap={press} transition={spring.snappy} onClick={() => onPick(s.id)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-field-line bg-white px-4 text-[15px] font-medium">
                  <s.icon className="size-4" strokeWidth={1.9} aria-hidden /> {s.label}
                </m.button>
              ))}
            </div>
          </m.section>
        )}
      </AnimatePresence>
    </div>
  );
}
