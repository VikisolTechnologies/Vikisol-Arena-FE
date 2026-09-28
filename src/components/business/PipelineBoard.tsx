"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { LayoutGroup, m } from "motion/react";
import { cn } from "@/lib/utils";
import { lift, spring } from "@/lib/motion";
import { Avatar } from "@/components/bplus/Avatar";
import { STAGES, STAGE_TONE, evidenceFor, type Applicant } from "@/lib/data/business";
import { shortDate } from "@/lib/data/time";
import type { ApplicationStage } from "@/lib/types";

const finePointer = (cb: () => void) => {
  const q = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
  q.addEventListener("change", cb);
  return () => q.removeEventListener("change", cb);
};

/** True on a desktop mouse/trackpad, where dragging between columns is the natural gesture. */
export function useCanDrag() {
  return useSyncExternalStore(finePointer, () => window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches, () => false);
}

/** A count that pops once when it changes (flow §11: column counts animate). */
export function PopCount({ value, className }: { value: number; className?: string }) {
  return (
    <m.span key={value} initial={{ scale: 1.35, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={spring.snappy} className={cn("inline-block tabular-nums", className)}>
      {value}
    </m.span>
  );
}

/** Move-to control: the single-pointer, keyboard and screen-reader way to change stage. */
export function MoveTo({ applicant, onMove, className }: { applicant: Applicant; onMove: (a: Applicant, s: ApplicationStage) => void; className?: string }) {
  return (
    <select
      aria-label={`Move ${applicant.candidate?.name ?? "candidate"} to`}
      value={applicant.stage}
      onChange={(e) => onMove(applicant, e.target.value as ApplicationStage)}
      className={cn("min-h-10 rounded-full border border-field-line bg-transparent px-3 text-[13px] font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-primary [&>option]:text-paper-ink", className)}
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id}>{s.id === applicant.stage ? `In ${s.label}` : `Move to ${s.label}`}</option>
      ))}
    </select>
  );
}

function Card({ a, must, canDrag, hrefFor, onMove, onHover, onDrop }: {
  a: Applicant;
  must: string[];
  canDrag: boolean;
  hrefFor: (a: Applicant) => string;
  onMove: (a: Applicant, s: ApplicationStage) => void;
  onHover: (s: ApplicationStage | null) => void;
  onDrop: (a: Applicant, s: ApplicationStage | null) => void;
}) {
  const dragged = useRef(false);
  const name = a.candidate?.name ?? "Candidate";
  const shown = evidenceFor(must, a.candidate).filter((e) => e.state === "shown").length;
  const stageAt = (x: number, y: number) => {
    const el = document.elementsFromPoint(x - window.scrollX, y - window.scrollY).find((n) => n instanceof HTMLElement && n.dataset.stage);
    return ((el as HTMLElement | undefined)?.dataset.stage as ApplicationStage | undefined) ?? null;
  };
  return (
    <m.li
      layout
      layoutId={`pipe-${a.id}`}
      transition={spring.gentle}
      drag={canDrag}
      dragSnapToOrigin
      dragElastic={0.9}
      whileDrag={{ ...lift, zIndex: 40, cursor: "grabbing" }}
      onDragStart={() => (dragged.current = true)}
      onDrag={(_, info) => onHover(stageAt(info.point.x, info.point.y))}
      onDragEnd={(_, info) => {
        onDrop(a, stageAt(info.point.x, info.point.y));
        setTimeout(() => (dragged.current = false), 0);
      }}
      className={cn("relative list-none rounded-2xl border border-line bg-surface p-3", canDrag && "cursor-grab")}
    >
      <Link
        href={hrefFor(a)}
        draggable={false}
        onClick={(e) => dragged.current && e.preventDefault()}
        className="flex items-start gap-2.5 rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Avatar name={name} className="size-8 shrink-0 text-[12px]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">{name}</span>
          <span className="block text-[12px] leading-snug text-faint">{a.candidate?.title || "Applied"} · {shortDate(a.appliedAt)}</span>
        </span>
      </Link>
      {must.length > 0 && <p className="mt-2 text-[12px] text-faint">Shows {shown}/{must.length} must-haves</p>}
      <MoveTo applicant={a} onMove={onMove} className="mt-2 w-full" />
    </m.li>
  );
}

/**
 * Flow §8 Pipeline Kanban. Drag a card between columns on desktop (lift 1.02 + shadow, spring
 * drop via shared layout); everywhere, each card's "Move to" menu does the same thing, so
 * dragging is never the only way (WCAG 2.5.7).
 */
export function PipelineBoard({ applicants, must, hrefFor, onMove }: {
  applicants: Applicant[];
  must: string[];
  hrefFor: (a: Applicant) => string;
  onMove: (a: Applicant, s: ApplicationStage) => void;
}) {
  const canDrag = useCanDrag();
  const [over, setOver] = useState<ApplicationStage | null>(null);
  const drop = (a: Applicant, s: ApplicationStage | null) => {
    setOver(null);
    if (s && s !== a.stage) onMove(a, s);
  };
  return (
    <LayoutGroup>
      <div className="-mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:overflow-visible lg:px-0">
        <div className="grid min-w-[1000px] grid-cols-5 gap-3 lg:min-w-0">
          {STAGES.map((s) => {
            const items = applicants.filter((a) => a.stage === s.id);
            return (
              <section
                key={s.id}
                data-stage={s.id}
                aria-label={`${s.label}: ${items.length}`}
                className={cn("min-h-64 rounded-tile border border-line bg-background/40 p-2.5 transition-colors duration-200", over === s.id && "border-primary/70 bg-primary/5")}
              >
                <header data-stage={s.id} className="mb-2.5 flex items-center justify-between px-1">
                  <h3 className="text-[14px] font-semibold">{s.label}</h3>
                  <span className={cn("grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-[12px] font-bold", STAGE_TONE[s.id])}><PopCount value={items.length} /></span>
                </header>
                <ul data-stage={s.id} className="min-h-40 space-y-2">
                  {items.map((a) => (
                    <Card key={a.id} a={a} must={must} canDrag={canDrag} hrefFor={hrefFor} onMove={onMove} onHover={setOver} onDrop={drop} />
                  ))}
                  {items.length === 0 && <li data-stage={s.id} className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[13px] text-faint">{canDrag ? "Drop someone here" : "No one here"}</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </LayoutGroup>
  );
}
