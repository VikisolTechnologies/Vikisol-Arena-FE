import { useSyncExternalStore } from "react";

// iOS Safari does NOT shrink the layout viewport (or dvh/svh, which derive from it) when the
// on-screen keyboard opens - only `window.visualViewport` does. This is the only reliable signal
// for "how much of the bottom of the screen is currently covered," so any mobile chat composer
// that must stay above the keyboard needs this, not a CSS-only vh/dvh approach.
function subscribe(callback: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", callback);
  vv.addEventListener("scroll", callback);
  return () => {
    vv.removeEventListener("resize", callback);
    vv.removeEventListener("scroll", callback);
  };
}

function getSnapshot(): number {
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

function getServerSnapshot(): number {
  return 0;
}

/** Px of inset past which callers should treat the bottom of the screen as "covered by a real
 * keyboard" rather than ordinary browser-chrome jitter. Shared so AppShell (hiding the mobile
 * tab bar) and /agent (sizing the chat panel) agree on the same moment. */
export const KEYBOARD_OPEN_THRESHOLD = 120;

/** Live px height of whatever (keyboard, or occasionally browser chrome) currently covers the
 * bottom of the layout viewport. 0 means "nothing covering it." Same useSyncExternalStore
 * pattern as use-is-mobile-viewport.ts / use-reduced-motion.ts. */
export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
