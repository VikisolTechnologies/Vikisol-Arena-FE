"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { m } from "motion/react";
import { AlertTriangle, ChevronRight, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { Avatar } from "@/components/bplus/Avatar";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Chip } from "@/components/bplus/Controls";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { MoveTo } from "@/components/business/PipelineBoard";
import { STAGES, STAGE_LABEL, evidenceFor, type Applicant } from "@/lib/data/business";
import { shortDate } from "@/lib/data/time";
import type { ApplicationStage } from "@/lib/types";

type StageFilter = "all" | ApplicationStage;
type Sort = "recent" | "evidence";
/** Evidence-only filters (flow §8). There is deliberately no age, gender, religion, caste or
 *  marital-status filter — the data isn't collected and must never be. */
type Filters = { skills: string[]; minYears: number; place: string; remoteOk: boolean };
const NO_FILTERS: Filters = { skills: [], minYears: 0, place: "", remoteOk: false };

const STAGE_TEXT: Record<ApplicationStage, string> = {
  applied: "text-success-on-paper",
  screening: "text-info-on-paper",
  interview: "text-success-on-paper",
  offer: "text-primary-on-paper",
  hired: "text-success-on-paper",
  rejected: "text-paper-ink-muted",
};

/** Recruiter board 5 — Review candidates: stage pills with counts, evidence filters, sort, bulk move. */
export function CandidateList({ applicants, must, hrefFor, onMove, onBulk, initialStage = "all" }: {
  applicants: Applicant[];
  must: string[];
  hrefFor: (a: Applicant) => string;
  onMove: (a: Applicant, s: ApplicationStage) => void;
  onBulk: (as: Applicant[], s: ApplicationStage) => void;
  initialStage?: StageFilter;
}) {
  const [stage, setStage] = useState<StageFilter>(initialStage);
  const [sort, setSort] = useState<Sort>("recent");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [sheet, setSheet] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const withEv = applicants.map((a) => ({ a, ev: evidenceFor(must, a.candidate) }));
    const list = withEv.filter(({ a }) => {
      const c = a.candidate;
      if (stage !== "all" && a.stage !== stage) return false;
      if (filters.skills.length && !filters.skills.every((s) => evidenceFor([s], c)[0].state === "shown")) return false;
      if (filters.minYears && (c?.experienceYears ?? 0) < filters.minYears) return false;
      if (filters.place && !`${c?.location ?? ""} ${c?.homeCity ?? ""}`.toLowerCase().includes(filters.place.toLowerCase())) return false;
      if (filters.remoteOk && !c?.remote) return false;
      return true;
    });
    return list.sort((x, y) =>
      sort === "evidence"
        ? y.ev.filter((e) => e.state === "shown").length - x.ev.filter((e) => e.state === "shown").length
        : Date.parse(y.a.appliedAt) - Date.parse(x.a.appliedAt),
    );
  }, [applicants, must, stage, sort, filters]);

  const count = (s: StageFilter) => (s === "all" ? applicants.length : applicants.filter((a) => a.stage === s).length);
  const options = [{ id: "all" as StageFilter, label: `All (${count("all")})` }, ...STAGES.map((s) => ({ id: s.id as StageFilter, label: `${s.label} (${count(s.id)})` }))];
  const active = filters.skills.length + (filters.minYears ? 1 : 0) + (filters.place ? 1 : 0) + (filters.remoteOk ? 1 : 0);
  const pickedPeople = applicants.filter((a) => picked.includes(a.id));
  const skillOptions = must.length ? must : [...new Set(applicants.flatMap((a) => (a.candidate?.skills ?? []).map((s) => s.name)))].slice(0, 12);

  return (
    <div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <div className="w-max"><Pills label="Stage" options={options} value={stage} onChange={(s) => { setStage(s); setPicked([]); }} compact /></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setDraft(filters); setSheet(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-field-line px-4 text-[14px] font-semibold hover:bg-foreground/5">
          <SlidersHorizontal className="size-4" aria-hidden /> Filter{active > 0 && <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">{active}</span>}
        </button>
        <label className="ml-auto flex items-center gap-2 text-[14px] text-faint">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="min-h-11 rounded-full border border-field-line bg-transparent px-3 text-[14px] font-semibold text-foreground [&>option]:text-paper-ink">
            <option value="recent">Most recent</option>
            <option value="evidence">Most must-haves shown</option>
          </select>
        </label>
      </div>

      {pickedPeople.length > 0 && (
        <m.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap items-center gap-2 rounded-tile bg-paper p-3 text-paper-ink" role="region" aria-label="Selected candidates">
          <span className="text-[14px] font-semibold">{pickedPeople.length} selected</span>
          <select
            aria-label="Move selected to"
            value=""
            onChange={(e) => {
              onBulk(pickedPeople, e.target.value as ApplicationStage);
              setPicked([]);
            }}
            className="ml-auto min-h-10 rounded-full border border-paper-ink/25 bg-white px-3 text-[14px] font-semibold"
          >
            <option value="" disabled>Move selected to…</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button type="button" onClick={() => setPicked([])} className="min-h-10 px-2 text-[14px] font-semibold text-paper-ink-muted">Clear</button>
        </m.div>
      )}

      {rows.length === 0 ? (
        <div className="mt-4">
          <StateCard kind="empty" title={applicants.length === 0 ? "No applicants yet" : "No one matches"} detail={applicants.length === 0 ? "Share the job link to reach local people." : "Try fewer filters or another stage."} />
        </div>
      ) : (
        <m.ul initial="hidden" animate="shown" className="mt-3 divide-y divide-paper-ink/10 overflow-hidden rounded-tile bg-paper text-paper-ink">
          {rows.map(({ a, ev }, i) => {
            const name = a.candidate?.name ?? "Candidate";
            const shown = ev.filter((e) => e.state === "shown").length;
            const missing = ev.find((e) => e.state === "missing");
            const on = picked.includes(a.id);
            return (
              <m.li key={a.id} variants={rise} custom={i} className="flex items-start gap-3 px-3 py-3.5 sm:px-4">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== a.id) : [...p, a.id]))}
                  aria-label={`Select ${name}`}
                  className="mt-3.5 size-5 shrink-0 accent-[var(--primary)]"
                />
                <Link href={hrefFor(a)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-primary">
                  <Avatar name={name} className="size-12 text-[15px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">{name}</span>
                    <span className="block text-[13px] text-paper-ink-muted"><span className={cn("font-semibold", STAGE_TEXT[a.stage])}>{STAGE_LABEL[a.stage]}</span> · Applied {shortDate(a.appliedAt)}</span>
                    {must.length > 0 && <span className="block text-[13px] text-paper-ink-muted">Shows {shown}/{must.length} must-haves</span>}
                    {a.candidate?.currentCtc != null && <span className="block text-[13px] text-paper-ink-muted">Current CTC ₹{a.candidate.currentCtc} LPA</span>}
                    {(a.candidate?.skills?.length ?? 0) > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.candidate!.skills.slice(0, 2).map((s) => <span key={s.name} className="rounded-full bg-paper-ink/8 px-2.5 py-0.5 text-[12px]">{s.name}</span>)}
                        {a.candidate!.skills.length > 2 && <span className="rounded-full bg-paper-ink/8 px-2.5 py-0.5 text-[12px]">+{a.candidate!.skills.length - 2}</span>}
                      </span>
                    )}
                    {missing && <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-warning/25 px-2.5 py-0.5 text-[12px] text-paper-ink"><AlertTriangle className="size-3.5" aria-hidden /> Not shown: {missing.item}</span>}
                  </span>
                  <ChevronRight className="mt-3 size-5 shrink-0 text-paper-ink-muted" aria-hidden />
                </Link>
                <MoveTo applicant={a} onMove={onMove} className="mt-1.5 hidden sm:block" onPaper />
              </m.li>
            );
          })}
        </m.ul>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Filter candidates" tone="dark">
        <h2 className="font-display-serif text-[24px] leading-tight">Filter by evidence</h2>
        <p className="mt-1 text-[14px] text-faint">Only what people chose to share.</p>
        <fieldset className="mt-4">
          <legend className="text-[15px] font-semibold">Shows these</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {skillOptions.map((s) => (
              <Chip key={s} selected={draft.skills.includes(s)} onToggle={() => setDraft((d) => ({ ...d, skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : [...d.skills, s] }))}>{s}</Chip>
            ))}
            {skillOptions.length === 0 && <p className="text-[14px] text-faint">No skills to filter on yet.</p>}
          </div>
        </fieldset>
        <label className="mt-4 block text-[15px] font-semibold">
          Minimum experience
          <select value={draft.minYears} onChange={(e) => setDraft((d) => ({ ...d, minYears: Number(e.target.value) }))} className="mt-1.5 block min-h-12 w-full rounded-xl border border-field-line bg-transparent [&>option]:text-paper-ink px-3 text-[15px] font-normal">
            {[0, 1, 2, 3, 5, 8].map((y) => <option key={y} value={y}>{y === 0 ? "Any" : `${y}+ years`}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[15px] font-semibold">
          Location
          <input value={draft.place} onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))} placeholder="An area" className="mt-1.5 block min-h-12 w-full rounded-xl border border-field-line bg-transparent [&>option]:text-paper-ink px-3 text-[15px] font-normal" />
        </label>
        <label className="mt-4 flex min-h-11 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={draft.remoteOk} onChange={(e) => setDraft((d) => ({ ...d, remoteOk: e.target.checked }))} className="size-5 accent-[var(--primary)]" />
          Open to remote
        </label>
        <p className="mt-4 flex gap-2 rounded-tile bg-foreground/6 p-3 text-[13px]">
          <ShieldCheck className="size-4 shrink-0 text-success-on-dark" aria-hidden />
          Arena never filters on age, gender, religion, caste or marital status. Notice period isn&apos;t shared with companies yet.
        </p>
        <div className="mt-5 grid gap-2">
          <Button onClick={() => { setFilters(draft); setSheet(false); }}>Show results</Button>
          <button type="button" onToggle={() => setDraft(NO_FILTERS)} className="min-h-11 text-[15px] font-semibold text-faint">Clear all</button>
        </div>
      </BottomSheet>
    </div>
  );
}
