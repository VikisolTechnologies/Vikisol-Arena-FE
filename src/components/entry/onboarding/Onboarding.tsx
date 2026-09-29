"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Screen, TopBar } from "@/components/bplus/Screen";
import { StepperDots } from "@/components/bplus/Controls";
import { pageSlide } from "@/lib/motion";
import { useDirection } from "@/components/motion/useDirection";
import { getSession, setOnboarded } from "@/lib/session";
import {
  clearEntryPending,
  EMPTY_DRAFT,
  readEntryDraft,
  saveOnboarding,
  subscribeEntryDraft,
  writeEntryDraft,
  type EntryDraft,
} from "@/lib/data/onboarding";
import { IdentityStep, IntentStep, LocalLifeStep, ReadyStep } from "./Steps";

const TOTAL = 4;
const SAVED_KEY = "arena_entry_saved";

function subscribeNothing() {
  return () => {};
}

/** Why → Local life → Identity → Ready. The step lives in the URL (`?step=`), so the browser's
 *  back button and a reload both land on the right step; answers live in the local draft. */
export function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const accountName = useSyncExternalStore(subscribeNothing, () => getSession()?.name ?? "", () => "");
  const hasSession = useSyncExternalStore(subscribeNothing, () => getSession() != null, () => true);
  const saved = useSyncExternalStore(subscribeNothing, () => sessionStorage.getItem(SAVED_KEY) === "1", () => false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const requested = Math.min(TOTAL, Math.max(1, Number(params.get("step")) || 1));
  // "You're all set" only after a real save in this session — never reached by URL alone.
  const step = requested === 4 && !saved ? 3 : requested;
  const direction = useDirection(step);

  useEffect(() => {
    if (!hasSession) router.replace("/auth?mode=signin");
  }, [hasSession, router]);

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
      go(4);
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
        onBack={step > 1 && step < 4 ? () => go(step - 1) : step === 1 ? () => (window.history.length > 1 ? router.back() : router.push("/auth")) : undefined}
        center={<StepperDots step={step} total={TOTAL} />}
        onSkip={step === 1 || step === 2 ? () => go(step + 1) : step === 3 && !saving ? () => void save() : undefined}
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
          {step === 1 && <IntentStep draft={draft} update={update} onContinue={() => (draft.intents.includes("explore") ? finishToFeed() : go(2))} />}
          {step === 2 && <LocalLifeStep draft={draft} update={update} onContinue={() => go(3)} />}
          {step === 3 && <IdentityStep draft={draft} update={update} accountName={accountName} onSave={save} saving={saving} saveError={saveError} />}
          {step === 4 && <ReadyStep draft={draft} accountName={accountName} onEdit={() => go(3)} />}
        </m.div>
      </AnimatePresence>
    </Screen>
  );
}
