"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Screen, TopBar } from "@/components/bplus/Screen";
import { StepperDots } from "@/components/bplus/Controls";
import { pageSlide } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { getSession, setOnboarded } from "@/lib/session";
import { getVerificationStatus } from "@/lib/api/verification";
import {
  clearEntryPending,
  EMPTY_DRAFT,
  readEntryDraft,
  saveOnboarding,
  subscribeEntryDraft,
  writeEntryDraft,
  type EntryDraft,
} from "@/lib/data/onboarding";
import { AgeGateStep, IdentityStep, IntentStep, LocalLifeStep, ReadyStep } from "./Steps";

const TOTAL = 5;
const SAVED_KEY = "arena_entry_saved";

function subscribeNothing() {
  return () => {};
}

/** Age gate → Why → Local life → Identity → Ready. The step lives in the URL (`?step=`), so the
 *  browser's back button and a reload both land on the right step; answers live in the local
 *  draft. The age gate is mandatory and un-skippable — it runs before everything else so it
 *  also covers the "Explore first" path, which otherwise jumps straight to the feed. */
export function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const accountName = useSyncExternalStore(subscribeNothing, () => getSession()?.name ?? "", () => "");
  const hasSession = useSyncExternalStore(subscribeNothing, () => getSession() != null, () => true);
  const saved = useSyncExternalStore(subscribeNothing, () => sessionStorage.getItem(SAVED_KEY) === "1", () => false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // Architect notes on area 2 (1 Oct 2026): sign-up now collects date of birth itself (B10) for
  // email accounts, so an account that already has one on file shouldn't be asked again here —
  // only phone/Google sign-up still need this step. null = still checking (real mode only).
  const [dobSet, setDobSet] = useState<boolean | null>(null);

  const requested = Math.min(TOTAL, Math.max(1, Number(params.get("step")) || 1));
  const checkingDob = requested === 1 && dobSet === null;
  // "You're all set" only after a real save in this session — never reached by URL alone.
  const step = requested === TOTAL && !saved ? TOTAL - 1 : requested === 1 && dobSet === true ? 2 : requested;
  const direction = useDirection(step);

  useEffect(() => {
    if (!hasSession) router.replace("/auth?mode=signin");
  }, [hasSession, router]);

  useEffect(() => {
    if (!hasSession) return;
    let cancelled = false;
    getVerificationStatus()
      .then((v) => { if (!cancelled) setDobSet(v.dateOfBirthSet); })
      .catch(() => { if (!cancelled) setDobSet(false); });
    return () => { cancelled = true; };
  }, [hasSession]);

  const go = (next: number) => {
    router.push(`/onboarding?step=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };
  const update = (patch: Partial<EntryDraft>) => writeEntryDraft({ ...readEntryDraft(), ...patch });

  const finishToFeed = () => {
    setOnboarded();
    clearEntryPending();
    router.push("/home");
  };

  /** Saves what Arena can store today, then shows "You're all set". On failure the identity
   *  step stays put with the reason, and every answer is still in the local draft. */
  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await saveOnboarding(readEntryDraft(), accountName);
      sessionStorage.setItem(SAVED_KEY, "1");
      setOnboarded();
      clearEntryPending();
      go(TOTAL);
    } catch (err) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setSaveError(
        offline
          ? "You're offline. Your answers are safe on this device — try again when you're connected."
          : `Arena couldn't save this yet${err instanceof Error && err.message ? `: ${err.message}` : "."} Your answers are still on this device.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar
        onBack={step > 1 && step < TOTAL ? () => go(step - 1) : step === 1 ? () => (window.history.length > 1 ? router.back() : router.push("/auth")) : undefined}
        center={<StepperDots step={step} total={TOTAL} />}
        // Step 1 (age gate) is mandatory — no skip. Steps 2 and 3 can be skipped forward; step 4 saves.
        onSkip={step === 2 || step === 3 ? () => go(step + 1) : step === 4 && !saving ? () => void save() : undefined}
      />
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <m.div
          key={step}
          custom={direction}
          variants={pageSlide}
          initial="enter"
          animate="center"
          exit="exit"
          className="flex flex-1 flex-col"
        >
          {step === 1 && !checkingDob && <AgeGateStep draft={draft} update={update} onContinue={() => go(2)} />}
          {step === 2 && <IntentStep draft={draft} update={update} onContinue={() => (draft.intents.includes("explore") ? finishToFeed() : go(3))} />}
          {step === 3 && <LocalLifeStep draft={draft} update={update} onContinue={() => go(4)} />}
          {step === 4 && <IdentityStep draft={draft} update={update} accountName={accountName} onSave={save} saving={saving} saveError={saveError} />}
          {step === 5 && <ReadyStep draft={draft} accountName={accountName} onEdit={() => go(4)} />}
        </m.div>
      </AnimatePresence>
    </Screen>
  );
}
