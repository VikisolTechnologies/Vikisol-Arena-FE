"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronDown, ChevronRight, CircleAlert, Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, press, rise, spring } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { PreviewPill } from "@/components/bplus/Primitives";
import { ApprovalSheet } from "@/components/jenny/ApprovalSheet";
import { QueueTile } from "@/components/jenny/QueueTile";
import { AUTOMATION_ROWS, ago, readAutomations, writeAutomations, type QueueGroup, type QueueItem } from "@/lib/data/jenny";

const GROUPS: { id: QueueGroup; title: string; tone: string }[] = [
  { id: "approval", title: "Needs your approval", tone: "text-primary" },
  { id: "handle", title: "Jenny can handle", tone: "text-success-on-dark" },
  { id: "waiting", title: "Waiting on others", tone: "text-foreground" },
];

/**
 * VNext AI-layer board #5 — Work, organised by Jenny: what needs your approval, what she has
 * prepared for you to use, and what's waiting on someone else. Every row ends in a tap by you.
 */
export function JennyWorkSections({ queue, only }: { queue: QueueItem[]; only?: QueueGroup }) {
  const [open, setOpen] = useState<Record<QueueGroup, boolean>>({ approval: true, handle: true, waiting: true });
  const [review, setReview] = useState<QueueItem | null>(null);
  const [menu, setMenu] = useState<QueueItem | null>(null);
  const groups = GROUPS.filter((g) => !only || g.id === only);

  return (
    <div className="space-y-5">
      {groups.map((g, gi) => {
        const rows = queue.filter((q) => q.group === g.id);
        if (rows.length === 0 && !only) return null;
        const isOpen = open[g.id];
        return (
          <m.section key={g.id} variants={rise} custom={gi} initial="hidden" animate="shown" aria-label={g.title}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
              <h2 className={cn("flex items-center gap-2 text-[19px] font-semibold", g.tone)}>
                {g.title} ({rows.length}) {gi === 0 && <PreviewPill />}
              </h2>
              <ChevronDown className={cn("size-5 transition-transform duration-200", g.tone, isOpen && "rotate-180")} strokeWidth={2} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div key="rows" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={fade} className="overflow-hidden">
                  {rows.length === 0 ? (
                    <p className="mt-1 text-[14px] text-faint">Nothing here right now.</p>
                  ) : (
                    <ul data-surface="paper" className="mt-2 divide-y divide-paper-ink/10 overflow-hidden rounded-[var(--radius-card)] bg-paper">
                      {rows.map((q) => (
                        <li key={q.id}>
                          <Row item={q} onReview={() => setReview(q)} onMenu={() => setMenu(q)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </m.section>
        );
      })}
      <ApprovalSheet item={review} onClose={() => setReview(null)} onDone={() => {}} />
      <HandleSheet item={menu} onClose={() => setMenu(null)} />
    </div>
  );
}

function Row({ item, onReview, onMenu }: { item: QueueItem; onReview: () => void; onMenu: () => void }) {
  const approval = item.group === "approval";
  const handle = item.group === "handle";
  const body: ReactNode = (
    <>
      <QueueTile icon={item.icon} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[16px] font-semibold leading-snug">{item.title}</span>
        <span className="block truncate text-[14px] text-paper-ink-muted">{item.detail}</span>
        {item.flag && (
          <span className={cn("mt-0.5 flex items-center gap-1.5 text-[13px] font-medium", approval ? "text-primary-on-paper" : "text-paper-ink-muted")}>
            {!handle && <CircleAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
            <span className="truncate">{item.flag}</span>
          </span>
        )}
      </span>
      {!handle && (
        <span className="flex shrink-0 flex-col items-end gap-2 self-stretch py-0.5 text-[12px] text-paper-ink-muted">
          <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
          <span className="mt-auto">{ago(item.at)}</span>
        </span>
      )}
    </>
  );
  const cls = "flex w-full items-center gap-3 p-3 text-left text-paper-ink outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
  if (handle) {
    return (
      <div className="flex items-center">
        {item.href ? <Link href={item.href} className={cn(cls, "pr-1")}>{body}</Link> : <div className={cls}>{body}</div>}
        <button type="button" onClick={onMenu} aria-label={`Options for ${item.title}`} className="mr-1.5 grid size-11 shrink-0 place-items-center rounded-full text-paper-ink hover:bg-paper-muted">
          <Ellipsis className="size-5" aria-hidden />
        </button>
      </div>
    );
  }
  if (item.action) {
    return (
      <m.button type="button" whileTap={press} transition={spring.snappy} onClick={onReview} className={cls} aria-label={`Review: ${item.title}`}>
        {body}
      </m.button>
    );
  }
  return item.href ? <Link href={item.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** "Jenny can handle" options: open what she prepared, or turn the automation off. */
function HandleSheet({ item, onClose }: { item: QueueItem | null; onClose: () => void }) {
  const auto = AUTOMATION_ROWS.find((a) => a.id === item?.automation);
  return (
    <BottomSheet open={!!item} onClose={onClose} title={item?.title ?? "Options"}>
      {item && (
        <div>
          <h2 className="mt-2 pr-12 font-display-serif text-[26px] font-medium leading-tight">{item.title}</h2>
          <p className="mt-1 text-[15px] text-paper-ink-muted">{item.detail} · {item.flag}</p>
          <p className="mt-4 rounded-tile bg-white p-3.5 text-[14px] ring-1 ring-paper-ink/10">
            Jenny prepared this. Nothing is added, sent or shared until you open it and choose to.
          </p>
          <div className="mt-5 space-y-2.5">
            {item.href && <ButtonLink href={item.href} onClick={onClose}>Open it</ButtonLink>}
            {auto && (
              <Button
                variant="outline"
                className="border-paper-ink/55 text-paper-ink"
                onClick={() => {
                  writeAutomations({ ...readAutomations(), [auto.id]: false });
                  onClose();
                }}
              >
                Turn off &ldquo;{auto.title}&rdquo;
              </Button>
            )}
            <button type="button" onClick={onClose} className="flex min-h-11 w-full items-center justify-center text-[16px] font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
