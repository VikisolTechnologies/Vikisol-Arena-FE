"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, m, useMotionValue } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { duration, ease, fade, spring } from "@/lib/motion";

const noopSubscribe = () => () => {};
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
/** Past either threshold a drag closes the sheet; otherwise it springs back. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 500;

/**
 * B+ bottom sheet: springs up (gentle, ~260ms), drags down to dismiss with velocity, closes on
 * Esc or the backdrop, traps focus while open and returns it to whatever opened it.
 * Reduced motion: MotionConfig turns the slide into an instant appear; the backdrop still fades.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  tone = "paper",
  showClose = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  tone?: "paper" | "dark";
  showClose?: boolean;
}) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  // Drag-to-dismiss by hand (pointer events on the handle + a motion value) rather than motion's
  // drag feature, which would put its whole drag/projection engine in every page's first load.
  const dragY = useMotionValue(0);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; v: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener.current instanceof HTMLElement) opener.current.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  const onHandleDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0 };
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    // Down follows the finger; up resists (the sheet can't be pulled off its resting place).
    dragY.set(dy > 0 ? dy : dy * 0.15);
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = ((e.clientY - d.lastY) / dt) * 1000;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
  };
  const onHandleUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (dragY.get() > DISMISS_DISTANCE || d.v > DISMISS_VELOCITY) onClose();
    else animate(dragY, 0, spring.gentle);
  };
  useEffect(() => {
    if (open) dragY.set(0);
  }, [open, dragY]);

  // Portals need `document`: render nothing on the server and during hydration, so a sheet that
  // starts open can't mismatch.
  if (!hydrated) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          data-theme="bplus"
          // ARENA-STABILIZE.md Phase 2, G2's fix (ui/dialog.tsx, ui/sheet.tsx) missed this sheet -
          // was z-50, sitting below CookieConsentBanner's z-[900] and BottomTabBar's z-[890], so a
          // sheet opened before either was dismissed had its own bottom-anchored primary button
          // (e.g. Report's "Submit report") covered and unclickable. A modal must always out-rank
          // persistent chrome, never sit under it.
          className="fixed inset-0 z-[950] flex items-end justify-center"
        >
          <m.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={onClose}
            aria-hidden
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ translateY: dragY }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: spring.gentle }}
            exit={{ y: "100%", transition: { duration: duration.base, ease: ease.out } }}
            className={cn(
              "relative max-h-[92svh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2 shadow-2xl",
              tone === "paper" ? "bg-paper text-paper-ink" : "bg-surface text-foreground",
            )}
          >
            <div
              className="mx-auto flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              onPointerDown={onHandleDown}
              onPointerMove={onHandleMove}
              onPointerUp={onHandleUp}
              onPointerCancel={onHandleUp}
              aria-hidden
            >
              <span className={cn("h-1 w-10 rounded-full", tone === "paper" ? "bg-paper-ink/25" : "bg-foreground/25")} />
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "absolute right-3 top-3 grid size-11 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-primary",
                  tone === "paper" ? "text-paper-ink hover:bg-paper-muted" : "text-foreground hover:bg-foreground/5",
                )}
              >
                <X className="size-5" strokeWidth={1.75} aria-hidden />
              </button>
            )}
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
