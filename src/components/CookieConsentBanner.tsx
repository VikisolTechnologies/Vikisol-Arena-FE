"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { markCookieConsentResolved } from "@/hooks/use-cookie-consent-visible";

const KEY = "arena_cookie_consent";
const HEIGHT_VAR = "--cookie-banner-h";

/** PRODUCTION-CHECKLIST.md: "granular cookie-consent banner with a reject option." Arena's own
 * cookies today are strictly functional (the JWT access token in localStorage, the HttpOnly
 * refresh-token cookie) - there's no analytics/ad tracking to actually gate yet, so "reject"
 * just dismisses the banner rather than disabling anything real. Kept simple rather than
 * building a granular-category toggle UI for categories that don't exist yet. */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Deliberate: reads a one-time localStorage flag to decide whether to show a banner at all -
    // not a data-sync effect, so flipping visible here on mount is the correct, only place to do it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(KEY)) setVisible(true);
  }, []);

  // ARENA-PERF-AND-MOBILE-FIX.md Track A finding: every fixed-bottom-space-reserving consumer
  // (AppShell's mobile nav, the legacy BottomTabBar, both sidebars) previously hardcoded a
  // guessed 88px banner height. That guess is only true on wide viewports where this text fits
  // on one line - at real mobile widths (390px) the copy wraps to 2 lines and the banner is
  // ~115px tall, so the guessed reservation undershot and the fixed mobile nav bar rendered
  // partly (AppShell: entirely, it had no reservation at all) behind the banner - unreachable
  // until the banner was dismissed. Measuring the real rendered height here and publishing it
  // as a CSS var removes the guesswork for every consumer, at every viewport width, permanently.
  useEffect(() => {
    if (!visible || !ref.current) {
      document.documentElement.style.setProperty(HEIGHT_VAR, "0px");
      return;
    }
    const el = ref.current;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty(HEIGHT_VAR, `${el.offsetHeight}px`);
    });
    observer.observe(el);
    document.documentElement.style.setProperty(HEIGHT_VAR, `${el.offsetHeight}px`);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty(HEIGHT_VAR, "0px");
    };
  }, [visible]);

  const respond = (choice: "accepted" | "rejected") => {
    localStorage.setItem(KEY, choice);
    setVisible(false);
    markCookieConsentResolved();
  };

  if (!visible) return null;

  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-[900] border-t border-border bg-background/95 px-5 py-4 backdrop-blur-[18px] sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cookie className="size-4 shrink-0 text-primary-soft" />
          We use strictly-necessary cookies to keep you signed in. See our{" "}
          <Link href="/privacy" className="text-primary-soft hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => respond("rejected")}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:border-white/20"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => respond("accepted")}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
