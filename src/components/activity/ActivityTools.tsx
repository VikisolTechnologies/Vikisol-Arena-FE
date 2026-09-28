"use client";

import { useState } from "react";
import { m } from "motion/react";
import { Clock } from "lucide-react";
import { rise } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { PaperInput } from "@/components/needs/PaperFields";
import { cancelPost, withdrawJoin } from "@/lib/api/posts";
import { sendRoomMessage } from "@/lib/api/rooms";

const HOUR = 3_600_000;

/** Day-of timing (flow §3): starting soon = within 3 h; check-in opens 1 h before and stays open
 *  72 h after (the attendance window). */
export function dayOf(startsAt?: string, now = Date.now()) {
  if (!startsAt) return { soon: false, checkIn: false, started: false, minutes: 0 };
  const t = Date.parse(startsAt);
  return { soon: t - now > 0 && t - now <= 3 * HOUR, checkIn: now >= t - HOUR && now <= t + 72 * HOUR, started: now >= t, minutes: Math.max(0, Math.round((t - now) / 60_000)) };
}

export function StartingSoon({ startsAt, point }: { startsAt: string; point?: string }) {
  const { minutes } = dayOf(startsAt);
  const when = minutes < 60 ? `in ${minutes} min` : `in about ${Math.round(minutes / 60)} h`;
  return (
    <m.div initial="hidden" animate="shown" variants={rise} className="flex items-center gap-3 rounded-tile bg-primary/10 p-4" role="status">
      <Clock className="size-6 shrink-0 text-primary-on-paper" aria-hidden />
      <div>
        <p className="text-[16px] font-semibold">Starting soon — {when}</p>
        {point && <p className="text-[14px] text-paper-ink-muted">Meet at {point}</p>}
      </div>
    </m.div>
  );
}

/** A11 — cancelling needs a reason; it's posted to the room so everyone who joined sees it. */
export function CancelActivitySheet({ open, onClose, postId, roomId, onCancelled }: { open: boolean; onClose: () => void; postId: string; roomId?: string; onCancelled: () => void }) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missing = reason.trim().length < 3 ? "Tell people why — a few words is enough." : "";
  const cancel = async () => {
    setTried((n) => n + 1);
    if (missing) return;
    setBusy(true);
    setError("");
    try {
      if (roomId) await sendRoomMessage(roomId, `The host cancelled this activity: ${reason.trim()}`);
      await cancelPost(postId);
      onCancelled();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "It wasn't cancelled. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Cancel activity">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Cancel this activity?</h2>
      <p className="mt-2 text-[15px] text-paper-ink-muted">Everyone who joined is told, with your reason{roomId ? " in the activity room" : ""}.</p>
      <div className="mt-5">
        <PaperInput label="Reason" value={reason} onChange={setReason} maxLength={160} placeholder="e.g. Rain forecast — moving it to next week" error={tried ? missing : ""} shakeSignal={tried} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={onClose}>Keep it</Button>
        <Button loading={busy} onClick={cancel} className="bg-danger-on-paper px-3 hover:bg-danger-on-paper active:bg-danger-on-paper">Cancel it</Button>
      </div>
    </BottomSheet>
  );
}

/** A16 — leaving before the start frees the spot for someone else. */
export function LeaveActivitySheet({ open, onClose, postId, onLeft }: { open: boolean; onClose: () => void; postId: string; onLeft: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <BottomSheet open={open} onClose={onClose} title="Leave activity">
      <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">Can&apos;t make it?</h2>
      <p className="mt-2 text-[15px] text-paper-ink-muted">Leaving frees your spot for someone else. You can ask to join again while there&apos;s room.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={onClose}>I&apos;ll be there</Button>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await withdrawJoin(postId);
              onLeft();
              onClose();
            } catch (err) {
              setError(err instanceof Error && err.message ? err.message : "You're still in. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Leave
        </Button>
      </div>
    </BottomSheet>
  );
}
