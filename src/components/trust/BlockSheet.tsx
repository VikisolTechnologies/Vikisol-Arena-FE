"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { blockUser } from "@/lib/api/blocks";

/** Block confirmation (board "Messages, trust…" action bar → Block). Real `POST /blocks/{id}`. */
export function BlockSheet({ open, onClose, person, onBlocked }: { open: boolean; onClose: () => void; person: { userId: string; name: string }; onBlocked: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = person.name.split(" ")[0];
  const block = async () => {
    setBusy(true);
    setError("");
    try {
      await blockUser(person.userId);
      onBlocked();
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't go through. Nothing changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={`Block ${first}`}>
      <span className="mt-4 grid size-14 place-items-center rounded-full bg-danger/12 text-danger-on-paper">
        <Ban className="size-7" strokeWidth={1.75} aria-hidden />
      </span>
      <h2 className="mt-4 font-display-serif text-[26px] font-medium">Block {first}?</h2>
      <p className="mt-2 text-[15px] text-paper-ink-muted">They won&apos;t be able to contact you. You can unblock them any time in Settings → Blocked accounts.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" className="border-paper-ink/55 text-paper-ink" onClick={onClose}>Cancel</Button>
        <Button onClick={block} loading={busy} className="bg-danger-on-paper hover:bg-danger-on-paper active:bg-danger-on-paper">Block</Button>
      </div>
    </BottomSheet>
  );
}
