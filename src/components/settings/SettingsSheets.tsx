"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { m } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { Button } from "@/components/bplus/Button";
import { Avatar } from "@/components/bplus/Avatar";
import { PaperInput } from "@/components/needs/PaperFields";
import { getMyVisibility, setMyVisibility, updateMyAutonomy, updateMyConsent, updateMyLocation, type ProfileVisibility } from "@/lib/api/profile";
import { confirmPhoneOtp, getVerificationStatus, requestPhoneOtp, setDateOfBirth } from "@/lib/api/verification";
import { changeEmail, changePassword } from "@/lib/api/auth";
import { getMyBlocks, unblockUser } from "@/lib/api/blocks";
import { ApiError } from "@/lib/api/httpClient";
import { isRealMode } from "@/lib/api/mode";
import { timeAgo } from "@/lib/data/time";
import { PASSWORD_MIN } from "@/lib/data/auth";
import type { AutonomyLevel, BlockedUser, CandidateProfile, LocationConsent, VerificationStatus } from "@/lib/types";

/* ── Paper-surface controls used by these sheets ── */

export function PaperRadios<T extends string>({ legend, options, value, onChange, disabled }: { legend: string; options: { value: T; label: string; detail: string; locked?: ReactNode }[]; value: T; onChange: (v: T) => void; disabled?: boolean }) {
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className="space-y-2">
        {options.map((o) => {
          const on = value === o.value;
          return o.locked ? (
            <div key={o.value} className="flex gap-3 rounded-tile border border-paper-ink/15 p-3.5 opacity-80">
              <span aria-hidden className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-field-line" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[16px] font-semibold">{o.label} <Lock className="size-3.5" aria-hidden /></span>
                <span className="block text-[14px] text-paper-ink-muted">{o.detail}</span>
                {o.locked}
              </span>
            </div>
          ) : (
            <label key={o.value} className={cn("flex cursor-pointer gap-3 rounded-tile border p-3.5", on ? "border-primary-on-paper bg-primary/10" : "border-paper-ink/15")}>
              <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="peer sr-only" />
              <span aria-hidden className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary", on ? "border-primary-on-paper" : "border-field-line")}>
                {on && <span className="size-2.5 rounded-full bg-primary-on-paper" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold">{o.label}</span>
                <span className="block text-[14px] text-paper-ink-muted">{o.detail}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PaperSwitch({ label, detail, checked, onChange, disabled, compact }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; /** Smaller type for dense lists (Jenny's automations). */ compact?: boolean }) {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-l`} className={compact ? "text-[15px] font-medium leading-snug" : "text-[16px] font-semibold"}>{label}</p>
        {detail && <p id={`${id}-d`} className={compact ? "text-[13px] text-paper-ink-muted" : "text-[14px] text-paper-ink-muted"}>{detail}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={detail ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full outline-none transition-colors duration-200 after:absolute after:-inset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50", checked ? "bg-primary-on-paper" : "bg-field-line")}
      >
        <m.span aria-hidden className="absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-sm" initial={false} animate={{ x: checked ? 20 : 0 }} transition={spring.snappy} />
      </button>
    </div>
  );
}

const Heading = ({ children, detail }: { children: ReactNode; detail?: ReactNode }) => (
  <>
    <h2 className="mt-3 pr-12 font-display-serif text-[26px] font-medium">{children}</h2>
    {detail && <p className="mt-1 text-[15px] text-paper-ink-muted">{detail}</p>}
  </>
);
const Err = ({ children }: { children?: string | null }) => (children ? <p role="alert" className="mt-3 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{children}</p> : null);

type SheetProps = { open: boolean; onClose: () => void; profile: CandidateProfile; onProfile: (p: CandidateProfile) => void };

/* ── Location (§5 consent): precise asks the browser here; city geocodes; off clears. ── */
const LOCATION_OPTIONS: { value: LocationConsent; label: string; detail: string }[] = [
  { value: "precise", label: "Approximate, from this device", detail: "Your device's location, coarsened before it's stored or shown to anyone." },
  { value: "city", label: "City only", detail: "Just the city you type — nothing from your device." },
  { value: "off", label: "Off", detail: "No location. Feed and Map still work, without distances." },
];
export function LocationSheet({ open, onClose, profile, onProfile }: SheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(profile.homeCity ?? "");
  const current = profile.locationConsent ?? "off";
  const choose = async (consent: LocationConsent) => {
    setError(null);
    if (consent === "off") {
      setBusy(true);
      try {
        onProfile(await updateMyLocation({ consent: "off" }));
      } catch {
        setError("That didn't save. Try again.");
      }
      return setBusy(false);
    }
    if (consent === "city") {
      if (!city.trim()) return setError("Enter your city first, then choose City only.");
      setBusy(true);
      try {
        onProfile(await updateMyLocation({ consent: "city", city: city.trim() }));
      } catch {
        setError("That didn't save. Try again.");
      }
      return setBusy(false);
    }
    if (!navigator.geolocation) return setError("Location isn't available in this browser.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          onProfile(await updateMyLocation({ consent: "precise", lat: pos.coords.latitude, lng: pos.coords.longitude }));
        } catch {
          setError("That didn't save. Try again.");
        }
        setBusy(false);
      },
      () => {
        setError("Couldn't get your location — check permissions and try again.");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Location">
      <Heading detail="Powers distances on Feed and Map. Your exact position is never stored.">Location</Heading>
      <div className="mt-5">
        <PaperRadios legend="Location" options={LOCATION_OPTIONS} value={current} onChange={choose} disabled={busy} />
      </div>
      <div className="mt-4">
        <PaperInput label="Your city" value={city} onChange={setCity} placeholder="e.g. Hyderabad" maxLength={60} />
      </div>
      {busy && <p role="status" className="mt-3 text-[14px] text-paper-ink-muted">Saving…</p>}
      <Err>{error}</Err>
    </BottomSheet>
  );
}

/* ── Career visibility ── */
export function CareerSheet({ open, onClose, profile, onProfile }: SheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = async (key: "searchableByEnterprises" | "autoApply") => {
    setBusy(true);
    setError(null);
    try {
      onProfile(await updateMyConsent({ ...profile.consent, [key]: !profile.consent[key] }));
    } catch {
      setError("That didn't save. Nothing changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Career visibility">
      <Heading detail="Your community side and your work side stay separate unless you choose.">Career visibility</Heading>
      <div className="mt-4 divide-y divide-paper-ink/10">
        <PaperSwitch label="Visible to employers" detail="Show up when verified companies search for talent." checked={profile.consent.searchableByEnterprises} onChange={() => toggle("searchableByEnterprises")} disabled={busy} />
      </div>
      <Err>{error}</Err>
    </BottomSheet>
  );
}

/* ── Profile visibility (FE-API-GAPS #60): who can find and open your community profile. ── */
const VISIBILITY: { value: ProfileVisibility; label: string; detail: string }[] = [
  { value: "everyone", label: "Everyone", detail: "Anyone can find and open your profile, signed in or not." },
  { value: "nearby", label: "Signed-in neighbors", detail: "Only people signed in to Arena can open your profile." },
  { value: "hidden", label: "Hidden", detail: "Your profile doesn't open for anyone. You can still use Arena normally." },
];
export function VisibilitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState<ProfileVisibility | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    getMyVisibility()
      .then(setValue)
      .catch(() => setError("Your current setting didn't load."));
  }, [open]);
  const change = async (v: ProfileVisibility) => {
    setBusy(true);
    setError(null);
    try {
      setValue(await setMyVisibility(v));
    } catch {
      setError("That didn't save. Nothing changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Profile visibility">
      <Heading detail="Who can find and open your community profile (separate from career visibility to employers).">Profile visibility</Heading>
      <div className="mt-5">
        {value === null && !error ? (
          <p className="text-[14px] text-paper-ink-muted">Loading…</p>
        ) : (
          <PaperRadios legend="Who can see your profile" options={VISIBILITY} value={value ?? "everyone"} onChange={change} disabled={busy} />
        )}
      </div>
      <Err>{error}</Err>
    </BottomSheet>
  );
}

/* ── Jenny's permissions. Product rule (architect review 29 Sep): Jenny prepares, you approve.
 *  Nothing auto-applies, so "Auto-apply" is not offered; if an older account still has it on,
 *  the sheet says so and offers to turn it off. ── */
const AUTONOMY: { value: AutonomyLevel; label: string; detail: string }[] = [
  { value: "manual", label: "Only when I ask", detail: "Jenny researches and drafts only when you ask her to." },
  { value: "supervised", label: "Suggest for me", detail: "Jenny prepares strong matches and drafts. You approve each one before anything is sent." },
];
export function JennySheet({ open, onClose, profile, onProfile }: SheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (fn: () => Promise<CandidateProfile>) => {
    setBusy(true);
    setError(null);
    try {
      onProfile(await fn());
    } catch {
      setError("That didn't save. Nothing changed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Jenny's permissions">
      <Heading detail="How much Jenny may do without asking.">Jenny&apos;s permissions</Heading>
      <div className="mt-5">
        <PaperRadios
          legend="How Jenny helps"
          options={AUTONOMY}
          value={profile.autonomy}
          onChange={(v) => save(() => updateMyAutonomy(v))}
          disabled={busy}
        />
      </div>
      {profile.consent.autoApply && (
        <div className="mt-4 rounded-tile bg-warning/25 p-3.5 text-[14px]">
          <p className="font-semibold">An older setting lets Jenny act on her own.</p>
          <p className="mt-1 text-paper-ink-muted">Arena now works one way: Jenny prepares, you approve.</p>
          <Button
            variant="outline"
            className="mt-3 h-11 border-paper-ink/40 text-paper-ink"
            loading={busy}
            onClick={() =>
              save(async () => {
                return updateMyConsent({ ...profile.consent, autoApply: false });
              })
            }
          >
            Turn it off
          </Button>
        </div>
      )}
      <p className="mt-3 text-[13px] text-paper-ink-muted">Jenny prepares, you approve. Nothing is applied, posted or sent without your tap.</p>
      <Err>{error}</Err>
    </BottomSheet>
  );
}

/* ── Verification & safety: date of birth + phone OTP ── */
export function VerificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [dob, setDob] = useState("");
  const [dobState, setDobState] = useState<"idle" | "saving" | "saved">("idle");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    getVerificationStatus()
      .then((v) => {
        setStatus(v);
        setPhone((p) => p || v.phoneNumber || "");
      })
      .catch(() => setError("Verification status didn't load."));
  }, [open]);
  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Verification and safety">
      <Heading detail="Needed before joining or hosting activities that meet in person.">Verification &amp; safety</Heading>
      <div className="mt-5 space-y-3">
        <PaperInput label="Date of birth" type="date" value={dob} onChange={(v) => { setDob(v); setDobState("idle"); }} hint="Self-declared, used only to keep under-18s out of meetups." />
        <Button
          variant="outline"
          className="border-paper-ink/55 text-paper-ink"
          disabled={!dob}
          loading={dobState === "saving"}
          success={dobState === "saved"}
          onClick={async () => {
            setDobState("saving");
            try {
              await setDateOfBirth(dob);
              setDobState("saved");
            } catch {
              setDobState("idle");
              setError("Date of birth didn't save.");
            }
          }}
        >
          Save date of birth
        </Button>
      </div>
      <div className="mt-6 border-t border-paper-ink/10 pt-5">
        <p className="text-[16px] font-semibold">Phone verification{status?.phoneVerified && <span className="ml-2 text-[14px] font-semibold text-success-on-paper">Verified</span>}</p>
        {status?.phoneVerified ? (
          <p className="mt-1 text-[15px] text-paper-ink-muted">{status.phoneNumber}</p>
        ) : status?.otpPending ? (
          <div className="mt-3 space-y-3">
            <p className="text-[14px] text-paper-ink-muted">Code sent to {status.phoneNumber}.{!isRealMode() && " (Demo mode: the code is 123456.)"}</p>
            <PaperInput label="6-digit code" value={otp} onChange={setOtp} autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
            <Button disabled={!otp.trim()} loading={busy} onClick={() => run(async () => { setStatus(await confirmPhoneOtp(otp.trim())); setOtp(""); }, "That code didn't work.")}>Confirm</Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <PaperInput label="Phone number" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
            <Button variant="outline" className="border-paper-ink/55 text-paper-ink" disabled={!phone.trim()} loading={busy} onClick={() => run(async () => { await requestPhoneOtp(phone.trim()); setStatus((v) => (v ? { ...v, otpPending: true, phoneNumber: phone.trim() } : v)); }, "Couldn't send a code.")}>Send code</Button>
          </div>
        )}
      </div>
      <Err>{error}</Err>
    </BottomSheet>
  );
}

/* ── Email & password (same calls as before; auth logic untouched) ── */
export function AccountSheet({ open, onClose, email, onEmail }: { open: boolean; onClose: () => void; email: string; onEmail: (e: string) => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "busy" | "saved">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwState, setPwState] = useState<"idle" | "busy" | "saved">("idle");
  const [pwError, setPwError] = useState<string | null>(null);
  return (
    <BottomSheet open={open} onClose={onClose} title="Email and password">
      <Heading detail={`You sign in with ${email || "your email"}.`}>Email &amp; password</Heading>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setEmailError(null);
          if (!newEmail.trim()) return setEmailError("Enter a new email address.");
          setEmailState("busy");
          try {
            const session = await changeEmail(newEmail.trim(), emailPassword);
            onEmail(session.email);
            setNewEmail("");
            setEmailPassword("");
            setEmailState("saved");
          } catch (err) {
            setEmailState("idle");
            setEmailError(err instanceof ApiError ? err.message : "Couldn't update your email — please try again.");
          }
        }}
      >
        <PaperInput label="New email" type="email" autoComplete="email" value={newEmail} onChange={(v) => { setNewEmail(v); setEmailState("idle"); }} />
        <PaperInput label="Current password" type="password" autoComplete="current-password" value={emailPassword} onChange={(v) => { setEmailPassword(v); setEmailState("idle"); }} />
        <Err>{emailError}</Err>
        <Button type="submit" variant="outline" className="border-paper-ink/55 text-paper-ink" loading={emailState === "busy"} success={emailState === "saved"}>Update email</Button>
      </form>
      <form
        className="mt-7 space-y-3 border-t border-paper-ink/10 pt-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setPwError(null);
          if (next.length < PASSWORD_MIN) return setPwError(`New password must be at least ${PASSWORD_MIN} characters.`);
          setPwState("busy");
          try {
            await changePassword(current, next);
            setCurrent("");
            setNext("");
            setPwState("saved");
          } catch (err) {
            setPwState("idle");
            setPwError(err instanceof ApiError ? err.message : "Couldn't update your password — please try again.");
          }
        }}
      >
        <PaperInput label="Current password (if you have one)" type="password" autoComplete="current-password" value={current} onChange={(v) => { setCurrent(v); setPwState("idle"); }} hint="Leave blank if you signed up with Google or a phone number and never set one." />
        <PaperInput label="New password" type="password" autoComplete="new-password" value={next} onChange={(v) => { setNext(v); setPwState("idle"); }} />
        <Err>{pwError}</Err>
        <Button type="submit" variant="outline" className="border-paper-ink/55 text-paper-ink" loading={pwState === "busy"} success={pwState === "saved"}>Update password</Button>
      </form>
    </BottomSheet>
  );
}

/* ── Blocked accounts ── */
export function BlockedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [blocks, setBlocks] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    getMyBlocks()
      .then((b) => setBlocks(Array.isArray(b) ? b : []))
      .catch(() => setError("Blocked accounts didn't load."));
  }, [open]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Blocked accounts">
      <Heading detail="People you've blocked can't contact you.">Blocked accounts</Heading>
      <Err>{error}</Err>
      {!blocks && !error && <p className="mt-4 text-[14px] text-paper-ink-muted">Loading…</p>}
      {blocks?.length === 0 && <p className="mt-4 text-[15px] text-paper-ink-muted">You haven&apos;t blocked anyone.</p>}
      <ul className="mt-4 divide-y divide-paper-ink/10">
        {blocks?.map((b) => (
          <li key={b.userId} className="flex items-center gap-3 py-2.5">
            <Avatar name={b.name} className="size-11 text-[15px]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{b.name}</span>
              <span className="block text-[13px] text-paper-ink-muted">Blocked {timeAgo(b.blockedAt)}</span>
            </span>
            <button
              type="button"
              disabled={busy === b.userId}
              onClick={async () => {
                setBusy(b.userId);
                try {
                  await unblockUser(b.userId);
                  setBlocks((cur) => cur?.filter((x) => x.userId !== b.userId) ?? cur);
                } catch {
                  setError(`Couldn't unblock ${b.name}. Try again.`);
                } finally {
                  setBusy(null);
                }
              }}
              className="min-h-11 rounded-full border border-paper-ink/50 px-4 text-[14px] font-semibold disabled:opacity-50"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
