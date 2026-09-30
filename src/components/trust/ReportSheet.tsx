"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Check, EyeOff, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { dissolve, vibrate } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Avatar } from "@/components/bplus/Avatar";
import { SuccessCheck } from "@/components/activity/ActivityParts";
import { reportPost } from "@/lib/api/posts";
import { reportChat } from "@/lib/api/messages";
import { reportRoom } from "@/lib/api/rooms";
import { blockUser } from "@/lib/api/blocks";
import { reportPerson } from "@/lib/api/profile";

export const REPORT_REASONS = [
  "Inappropriate messages",
  "Harassment or hate speech",
  "Fake profile",
  "Spam or unsolicited contact",
  "Unsafe behavior",
  "Other",
] as const;

export type ReportTarget = { kind: "room" | "chat" | "post" | "profile"; id: string };

/**
 * Board "Messages, trust…" #6 — Report a problem. One sheet for rooms, chats and posts, using
 * each one's real report endpoint; optionally also blocks the person (real `POST /blocks/{id}`).
 * Evidence upload isn't offered: report endpoints take a reason only (FE-API-GAPS #15).
 */
export function ReportSheet({
  open,
  onClose,
  target,
  person,
}: {
  open: boolean;
  onClose: () => void;
  target: ReportTarget;
  /** The person involved, when there is one: shown on top, and "Also block" is offered. */
  person?: { userId?: string; name: string; detail?: string };
}) {
  const group = useId();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [tried, setTried] = useState(false);

  const submit = async () => {
    setTried(true);
    if (!reason) return;
    setBusy(true);
    setError("");
    const text = details.trim() ? `${reason}: ${details.trim()}` : reason;
    try {
      if (target.kind === "room") await reportRoom(target.id, text);
      else if (target.kind === "chat") await reportChat(target.id, text);
      else if (target.kind === "profile") await reportPerson(target.id, { reason: text });
      else await reportPost(target.id, text);
      if (alsoBlock && person?.userId) await blockUser(person.userId);
      vibrate();
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Your report didn't send. Nothing was lost — try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose();
    // Reset after the sheet has slid away.
    window.setTimeout(() => {
      setReason("");
      setDetails("");
      setAlsoBlock(false);
      setSent(false);
      setTried(false);
      setError("");
    }, 320);
  };

  return (
    <BottomSheet open={open} onClose={close} title="Report a problem">
      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <m.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve} className="pt-4 text-center">
            <SuccessCheck />
            <h2 className="mt-4 font-display-serif text-[26px] font-medium">Thanks for telling us</h2>
            <p className="mt-2 text-[15px] text-paper-ink-muted">
              Our safety team reviews every report.{alsoBlock && person ? ` ${person.name.split(" ")[0]} can't contact you any more.` : ""}
            </p>
            <Button className="mt-6" onClick={close}>Done</Button>
          </m.div>
        ) : (
          <m.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Report a problem</h2>
            {person && (
              <div className="mt-4 flex items-center gap-3 rounded-tile bg-paper-muted p-3">
                <Avatar name={person.name} className="size-11 text-[15px]" />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{person.name}</p>
                  {person.detail && <p className="truncate text-[13px] text-paper-ink-muted">{person.detail}</p>}
                </div>
              </div>
            )}
            <fieldset className="mt-5" aria-describedby={tried && !reason ? `${group}-e` : undefined}>
              <legend className="text-[16px] font-semibold">What&apos;s the issue?</legend>
              <div className="mt-2 space-y-0.5">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                    <input type="radio" name={group} value={r} checked={reason === r} onChange={() => setReason(r)} className="peer sr-only" />
                    <span aria-hidden className={cn("grid size-5 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", reason === r ? "border-primary-on-paper" : "border-field-line")}>
                      {reason === r && <span className="size-2.5 rounded-full bg-primary-on-paper" />}
                    </span>
                    {r}
                  </label>
                ))}
              </div>
              {tried && !reason && <p id={`${group}-e`} className="mt-1 text-[13px] text-danger-on-paper">Choose the closest reason.</p>}
            </fieldset>
            <label className="mt-4 block">
              <span className="mb-2 block text-[15px] font-semibold">Tell us more (optional)</span>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} placeholder="What happened? Only our safety team sees this." className="block w-full resize-none rounded-button border border-field-line bg-white px-4 py-3 text-[16px] text-paper-ink outline-none placeholder:text-paper-ink-muted focus:border-primary-on-paper" />
            </label>
            {person?.userId && (
              <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="peer sr-only" />
                <span aria-hidden className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", alsoBlock ? "border-primary-on-paper bg-primary-on-paper text-white" : "border-field-line bg-white")}>
                  {alsoBlock && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                Also block {person.name.split(" ")[0]}
              </label>
            )}
            <section className="mt-5 rounded-tile bg-paper-muted p-4" aria-label="What happens next">
              <p className="text-[15px] font-semibold">What happens next?</p>
              <ul className="mt-2 space-y-2.5 text-[14px]">
                <li className="flex gap-2.5"><ShieldCheck className="size-5 shrink-0 text-success-on-paper" aria-hidden /> Our safety team reviews every report.</li>
                <li className="flex gap-2.5"><EyeOff className="size-5 shrink-0" aria-hidden /> You can block this person — they won&apos;t be able to contact you.</li>
                <li className="flex gap-2.5"><Users className="size-5 shrink-0" aria-hidden /> If needed, we&apos;ll take action to keep Arena safe for everyone.</li>
              </ul>
            </section>
            {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={close}>Cancel</Button>
              <Button onClick={submit} loading={busy} className="px-3">Submit report</Button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
