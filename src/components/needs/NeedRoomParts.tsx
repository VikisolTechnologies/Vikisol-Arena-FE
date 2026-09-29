"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { CheckCircle2, Clock3, Lock } from "lucide-react";
import { dissolve, vibrate } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Burst } from "@/components/bplus/Burst";
import { SuccessCheck } from "@/components/activity/ActivityParts";
import { PaperInput } from "@/components/needs/PaperFields";
import { closeNeed } from "@/lib/api/posts";
import { reportRoom, sendRoomMessage } from "@/lib/api/rooms";
import { MEETING_LINK_PREFIX, isMeetingUrl } from "@/lib/data/needs";

/** Board screen 5: the room is private to the two people coordinating. */
export function PrivateBanner({ other }: { other: string }) {
  return (
    <div className="flex items-center gap-3 rounded-tile bg-success-on-paper px-4 py-3 text-white">
      <Lock className="size-5 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">Private coordination room</p>
        <p className="text-[13px] text-white/90">Only you and {other} can see this chat.</p>
      </div>
    </div>
  );
}

/** "Add meeting link" (correction #6 — replaces the board's audio room). The link is posted into
 *  the room so both people see it; the pinned card shows the newest one. https only. */
export function MeetingLinkSheet({ open, roomId, onClose, onSent }: { open: boolean; roomId: string; onClose: () => void; onSent: () => void }) {
  const [url, setUrl] = useState("");
  const [submitted, setSubmitted] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const invalid = !isMeetingUrl(url) ? "Paste a full https:// link (Google Meet, Zoom, Teams…)." : "";
  const send = async () => {
    setSubmitted((n) => n + 1);
    if (invalid) return;
    setBusy(true);
    setError("");
    try {
      await sendRoomMessage(roomId, `${MEETING_LINK_PREFIX}${url.trim()}`);
      setUrl("");
      setSubmitted(0);
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The link didn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Add meeting link">
      <h2 className="mt-3 font-display-serif text-[24px] font-medium">Add a meeting link</h2>
      <p className="mt-1 text-[15px] text-paper-ink-muted">It&apos;s shared in this chat and pinned to the plan.</p>
      <form
        className="mt-5 space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <PaperInput label="Meeting link" value={url} onChange={setUrl} placeholder="https://meet.example.com/abc-defg" error={submitted ? invalid : ""} shakeSignal={submitted} />
        {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
        <Button type="submit" loading={busy}>Share link</Button>
      </form>
    </BottomSheet>
  );
}

/**
 * Board screen 6 — Mark as completed. The owner closes the need for real (`closeNeed`). Arena BE
 * has no two-sided confirmation yet (FE-API-GAPS #11), so the sheet says exactly who confirmed.
 */
export function CompleteSheet({
  open,
  onClose,
  postId,
  roomId,
  title,
  other,
  onCompleted,
  initialStage = "ask",
  noun = "need",
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  roomId: string;
  title: string;
  other: string;
  onCompleted: () => void;
  initialStage?: "ask" | "done";
  noun?: "need" | "offer";
}) {
  const [stage, setStage] = useState<"ask" | "done">(initialStage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [noteSent, setNoteSent] = useState(false);
  const [reported, setReported] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await closeNeed(postId);
      vibrate();
      setStage("done");
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. The need is still open.");
    } finally {
      setBusy(false);
    }
  };
  const finish = async () => {
    if (note.trim() && !noteSent) {
      setBusy(true);
      try {
        await sendRoomMessage(roomId, `Marked as completed — ${note.trim()}`);
        setNoteSent(true);
      } catch {
        setBusy(false);
        return setError("Your note didn't send. The need is completed; try the note again or skip it.");
      }
      setBusy(false);
    }
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Mark as completed">
      <AnimatePresence mode="wait" initial={false}>
        {stage === "ask" ? (
          <m.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            <h2 className="mt-3 pr-12 font-display-serif text-[28px] font-medium">Mark as completed</h2>
            <p className="mt-1 text-[15px] text-paper-ink-muted">{noun === "need" ? "Did the need get resolved?" : "Did it happen?"}</p>
            <p className="mt-5 rounded-tile bg-paper-muted p-4 text-[15px]"><strong className="font-semibold">{title}</strong> will show as completed for you and {other}, and move to Completed on Work.</p>
            {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <div className="mt-6 space-y-2">
              <Button onClick={confirm} loading={busy}>Yes, it&apos;s resolved</Button>
              <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={onClose}>Not yet</Button>
            </div>
          </m.div>
        ) : (
          <m.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
            <div className="relative mx-auto mt-4 w-fit">
              <SuccessCheck />
              <Burst count={16} radius={80} />
            </div>
            <h2 className="mt-4 text-center font-display-serif text-[30px] font-medium">It&apos;s done!</h2>
            <p className="mt-1 text-center text-[16px]"><strong className="font-semibold">{title}</strong> has been completed.</p>
            <ul className="mt-5 space-y-2.5">
              <li className="flex items-center gap-3 rounded-tile bg-paper-muted p-3.5">
                <CheckCircle2 className="size-6 shrink-0 text-success-on-paper" aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">Confirmed on your side</p>
                  <p className="text-[13px] text-paper-ink-muted">You marked this {noun} as done.</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-tile bg-paper-muted p-3.5">
                <Clock3 className="size-6 shrink-0 text-paper-ink-muted" aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold">{other}</p>
                  <p className="text-[13px] text-paper-ink-muted">Sees it as completed in this chat and on Work.</p>
                </div>
              </li>
            </ul>
            <div className="mt-5">
              <PaperInput label="Anything you'd like to share? (optional)" value={note} onChange={setNote} maxLength={200} placeholder="A short note, sent in this chat" />
            </div>
            {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
            <Button className="mt-5" onClick={finish} loading={busy}>Done</Button>
            <ButtonLink href="/work?tab=completed" variant="link" className="mt-1 w-full text-primary-on-paper">See it on Work</ButtonLink>
            <p className="mt-2 text-center text-[13px] text-paper-ink-muted">
              Something not right?{" "}
              {reported ? (
                <span role="status">Reported — our team will look at it.</span>
              ) : (
                <button type="button" className="font-semibold text-danger-on-paper underline underline-offset-2" onClick={() => reportRoom(roomId, "Outcome reported after completion").then(() => setReported(true)).catch(() => setError("That report didn't send. Try again."))}>
                  Report this outcome
                </button>
              )}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
