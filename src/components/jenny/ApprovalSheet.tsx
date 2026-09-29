"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ChevronDown, CircleCheck, Database, FileText, RotateCcw, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, vibrate } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { JennyOrb } from "@/components/jenny/JennyOrb";
import { approve, keepAsking, type QueueItem } from "@/lib/data/jenny";

/**
 * VNext AI-layer board #6 — Approve action. Shows exactly what goes out, to whom, and which data
 * it uses; the undo line only when the action says it's reversible (correction #5). One tap sends
 * once; a lost response is never retried blindly.
 */
export function ApprovalSheet({ item, onClose, onDone }: { item: QueueItem | null; onClose: () => void; onDone: () => void }) {
  return (
    <BottomSheet open={!!item?.action} onClose={onClose} title="Approve action">
      {item?.action && <Body key={item.id} item={item} onClose={onClose} onDone={onDone} />}
    </BottomSheet>
  );
}

function Body({ item, onClose, onDone }: { item: QueueItem; onClose: () => void; onDone: () => void }) {
  const a = item.action!;
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showPeople, setShowPeople] = useState(false);

  const go = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const d = await approve(item);
      vibrate();
      setDone(d.note);
      onDone();
    } catch {
      setError("Couldn't confirm it went out. Check the conversation before trying again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="pb-1">
      <h2 className="mt-2 pr-12 font-display-serif text-[28px] font-medium leading-tight">Approve action</h2>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <m.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={fade} className="py-8 text-center" role="status">
            <CircleCheck className="mx-auto size-12 text-success-on-paper" strokeWidth={1.75} aria-hidden />
            <p className="mt-3 font-display-serif text-[24px]">Approved</p>
            <p className="mt-1 text-[15px] text-paper-ink-muted">{done}</p>
            <Button className="mt-6" onClick={onClose}>Done</Button>
          </m.div>
        ) : (
          <m.div key="ask" exit={{ opacity: 0 }} transition={fade}>
            <section className="mt-4 rounded-tile bg-white p-4 ring-1 ring-paper-ink/10">
              <div className="flex items-center gap-3">
                <JennyOrb size={36} online={false} still />
                <p className="text-[19px] font-semibold">{a.question}</p>
              </div>
              <figure className="mt-3 flex gap-3 rounded-xl bg-paper-muted p-3.5">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-paper-ink-muted">
                  <FileText className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <blockquote className="text-[15px] leading-relaxed">{a.content}</blockquote>
                  <figcaption className="mt-2 text-[14px] text-paper-ink-muted">{a.signature}</figcaption>
                </div>
              </figure>
            </section>

            <section className="mt-5" aria-label="Recipient or audience">
              <h3 className="flex items-center gap-2.5 text-[16px] font-semibold">
                <UsersRound className="size-5" strokeWidth={1.9} aria-hidden /> Recipient / audience
              </h3>
              <button type="button" aria-expanded={showPeople} onClick={() => setShowPeople((s) => !s)} className="mt-1 flex min-h-11 w-full items-center gap-2 pl-8 text-left text-[15px]">
                <span className="flex-1">{a.recipients.summary}</span>
                <ChevronDown className={cn("size-5 shrink-0 text-paper-ink-muted transition-transform duration-200", showPeople && "rotate-180")} aria-hidden />
                <span className="sr-only">{showPeople ? "Hide the list" : "Show everyone"}</span>
              </button>
              {showPeople && (
                <ul className="space-y-1 pb-1 pl-12 text-[14px] text-paper-ink-muted">
                  {a.recipients.people.map((p) => <li key={p} className="list-disc">{p}</li>)}
                </ul>
              )}
            </section>

            <section className="mt-3" aria-label="Data used">
              <h3 className="flex items-center gap-2.5 text-[16px] font-semibold">
                <Database className="size-5" strokeWidth={1.9} aria-hidden /> Data used
              </h3>
              <ul className="mt-2 space-y-1 pl-12 text-[15px]">
                {a.dataUsed.map((d) => <li key={d} className="list-disc">{d}</li>)}
              </ul>
              {!a.exactLocationShared && <p className="mt-2 pl-8 text-[14px] italic text-paper-ink-muted">Exact location is not shared.</p>}
            </section>

            {a.reversible && (
              <p className="mt-4 flex items-center gap-3 rounded-tile bg-white p-3.5 text-[14px] ring-1 ring-paper-ink/10">
                <RotateCcw className="size-5 shrink-0" strokeWidth={1.9} aria-hidden /> You can undo this within 10 minutes if needed.
              </p>
            )}

            {error && <p role="alert" className="mt-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <div className="mt-6 space-y-2.5">
              <Button loading={busy} onClick={go}>{a.approveLabel}</Button>
              <Button
                variant="outline"
                className="border-paper-ink/55 text-paper-ink"
                disabled={busy}
                onClick={() => {
                  keepAsking(item);
                  onClose();
                }}
              >
                Always ask me
              </Button>
              <button type="button" onClick={onClose} disabled={busy} className="flex min-h-11 w-full items-center justify-center text-[16px] font-semibold text-paper-ink">Cancel</button>
            </div>
            <p className="mt-1 text-center text-[13px] text-paper-ink-muted">Nothing goes out unless you approve it. &ldquo;Always ask me&rdquo; keeps this for later.</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
