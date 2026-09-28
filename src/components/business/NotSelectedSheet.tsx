"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { notSelectedMessage, type Applicant } from "@/lib/data/business";

/**
 * Flow §8 "close the loop": moving someone to Not selected always shows the kind message first.
 * Arena's API sends its own notice + email on the stage change; the personal wording can't travel
 * with it yet (FE-API-GAPS #31), and the sheet says so rather than implying it's sent.
 */
export function NotSelectedSheet({
  people,
  company,
  onClose,
  onConfirm,
}: {
  people: Applicant[];
  company: string;
  onClose: () => void;
  onConfirm: (people: Applicant[]) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = people[0];
  const name = first?.candidate?.name ?? "there";
  const many = people.length > 1;

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      await onConfirm(people);
    } catch {
      setError("That didn't save. Nobody was notified — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={people.length > 0} onClose={busy ? () => {} : onClose} title={many ? `Mark ${people.length} people not selected` : `Mark ${name} not selected`}>
      {first && (
        <div className="pb-2">
          <h2 className="font-display-serif text-[24px] leading-tight">{many ? `Not selected: ${people.length} people` : `Not selected: ${name}`}</h2>
          <p className="mt-2 text-[15px] text-paper-ink-muted">Everyone hears back. Arena tells them in the app and by email that the application wasn&apos;t taken forward.</p>
          <figure className="mt-4 rounded-tile bg-paper-muted p-4">
            <figcaption className="flex items-center gap-2 text-[13px] font-semibold text-paper-ink-muted"><Mail className="size-4" aria-hidden /> A kind message{many ? " (first name changes for each person)" : ""}</figcaption>
            <p className="mt-2 text-[15px] leading-relaxed">{notSelectedMessage(name, first.posting.title, company)}</p>
          </figure>
          <p className="mt-3 text-[13px] text-paper-ink-muted">This wording isn&apos;t sent yet — Arena&apos;s standard notice goes instead until personal messages are supported.</p>
          {error && <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px] text-danger-on-paper">{error}</p>}
          <div className="mt-5 grid gap-2">
            <Button onClick={confirm} loading={busy}>{many ? `Mark ${people.length} not selected` : "Mark not selected"}</Button>
            <button type="button" onClick={onClose} disabled={busy} className="min-h-11 text-[15px] font-semibold text-paper-ink-muted">Cancel</button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
