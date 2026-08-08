import { useSyncExternalStore } from "react";

const KEY = "arena_cookie_consent";
const EVENT = "arena:cookie-consent-changed";

/** CookieConsentBanner calls this after the user responds, so every subscriber (the app
 * shells' sidebars, which need to reserve space for the banner while it's up) re-renders
 * immediately rather than waiting for a storage event from another tab. */
export function markCookieConsentResolved() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(KEY) === null;
}

function getServerSnapshot() {
  return false;
}

/** Same useSyncExternalStore pattern as use-reduced-motion.ts. The cookie banner is a fixed,
 * full-width, bottom-of-viewport overlay (see CookieConsentBanner) - on every app shell whose
 * sidebar/nav reaches the bottom of the viewport (all 5 role shells have a "Log out" button
 * there), the banner physically covers it and blocks the click until dismissed. Shells use
 * this to reserve bottom space for as long as the banner is up, instead of letting it silently
 * intercept pointer events on real navigation. */
export function useCookieConsentVisible() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
