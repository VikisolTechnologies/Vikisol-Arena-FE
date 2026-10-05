"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import { fade, spring } from "@/lib/motion";
import { Button, ButtonLink } from "@/components/bplus/Button";

const noopSubscribe = () => () => {};

/**
 * "Add your date of birth to continue" (MARATHON-FE-2 Step 0): the backend refuses this one
 * write; everything else on the account still works. Mount once near the app root (see
 * SessionExpiredSheet's same pattern) — `MissingDobMount` wires it to `lib/api/missingDob.ts`.
 */
export function MissingDobSheet({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const titleId = useId();
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!hydrated) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          data-theme="bplus"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 pb-[max(16px,env(safe-area-inset-bottom))] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          role="presentation"
          onClick={onDismiss}
        >
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={spring.gentle}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[20px] bg-paper p-6 text-paper-ink shadow-[0_20px_48px_rgba(22,17,15,0.35)]"
          >
            <h2 id={titleId} className="font-display-serif text-[26px] font-medium leading-tight">
              Add your date of birth
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-paper-ink-muted">
              Arena needs to know you&apos;re 18 or older before this can go through. It only
              takes a moment, and nothing else about your account changes.
            </p>
            <div className="mt-6 space-y-3">
              <ButtonLink href="/settings?sheet=verification" onClick={onDismiss}>
                Add date of birth
              </ButtonLink>
              <Button type="button" variant="outline" onClick={onDismiss} className="!text-paper-ink border-paper-ink/40">
                Not now
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
