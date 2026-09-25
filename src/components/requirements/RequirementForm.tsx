"use client";

import { useState } from "react";
import { Cake, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmPhoneOtp, requestPhoneOtp, setDateOfBirth } from "@/lib/api/verification";

/**
 * Some actions need one missing detail first - a date of birth to create/join an activity, a
 * verified phone to join an activity that asks for one. Instead of sending people to Settings
 * (and losing whatever they'd typed), the action asks for just that detail right where they are,
 * saves it, and then carries on with the original action.
 */
export type Requirement = "dob" | "phone";

/** Recognises a backend error that one of these forms can fix. Anything else stays an error. */
export function requirementFromError(err: unknown): Requirement | null {
  const message = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (message.includes("date of birth")) return "dob";
  if (message.includes("verification to join") && message.includes("phone")) return "phone";
  return null;
}

// Latest date that makes someone 18 today - the date picker won't offer anything later.
function eighteenYearsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

const COPY: Record<Requirement, { title: string; description: string }> = {
  dob: {
    title: "Add your date of birth",
    description: "Activities meet in person, so Arena checks everyone is 18 or older. It's never shown to anyone.",
  },
  phone: {
    title: "Verify your phone",
    description: "The host asked that people joining have a verified phone number. It isn't shown to anyone.",
  },
};

/** The form itself - embed it inline (e.g. inside the post form) or use RequirementDialog. */
export function RequirementForm({ requirement, onDone, onCancel }: { requirement: Requirement; onDone: () => void; onCancel?: () => void }) {
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work - try again.");
    } finally {
      setBusy(false);
    }
  }

  const Icon = requirement === "dob" ? Cake : Phone;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary-soft">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-foreground">{COPY[requirement].title}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{COPY[requirement].description}</p>
        </div>
      </div>

      {requirement === "dob" ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (dob) run(async () => { await setDateOfBirth(dob); onDone(); });
          }}
        >
          <Input type="date" value={dob} max={eighteenYearsAgo()} onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" className="flex-1 border-border bg-card" />
          <Button type="submit" size="sm" disabled={!dob || busy} className="h-9">
            {busy ? "Saving…" : "Save & continue"}
          </Button>
        </form>
      ) : !codeSent ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.trim()) run(async () => { await requestPhoneOtp(phone.trim()); setCodeSent(true); });
          }}
        >
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" aria-label="Phone number" className="flex-1 border-border bg-card" />
          <Button type="submit" size="sm" disabled={!phone.trim() || busy} className="h-9">
            {busy ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) run(async () => { await confirmPhoneOtp(code.trim()); onDone(); });
          }}
        >
          <p className="text-[12px] text-muted-foreground">
            We sent a code to {phone}.{" "}
            <button type="button" className="underline" onClick={() => { setCodeSent(false); setCode(""); }}>
              Change number
            </button>
          </p>
          <div className="flex gap-2">
            <Input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" aria-label="Verification code" className="flex-1 border-border bg-card" />
            <Button type="submit" size="sm" disabled={!code.trim() || busy} className="h-9">
              {busy ? "Checking…" : "Verify & continue"}
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-[12px] text-red-400">{error}</p>}
      {onCancel && (
        <button type="button" onClick={onCancel} className="self-start text-[12px] text-muted-foreground hover:text-foreground">
          Not now
        </button>
      )}
    </div>
  );
}

/** The same form as a small popup, for actions that aren't already inside a form (e.g. Join). */
export function RequirementDialog({
  requirement,
  onOpenChange,
  onDone,
}: {
  requirement: Requirement | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={requirement !== null} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover sm:max-w-md">
        {/* Visually the form carries its own heading; these keep the dialog labelled for screen readers. */}
        <DialogHeader className="sr-only">
          <DialogTitle>{requirement ? COPY[requirement].title : ""}</DialogTitle>
          <DialogDescription>{requirement ? COPY[requirement].description : ""}</DialogDescription>
        </DialogHeader>
        {requirement && <RequirementForm key={requirement} requirement={requirement} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  );
}
