"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";

/** The B+ page frame: opts into the B+ tokens, respects safe areas, and on wide screens keeps
 *  the mobile layout in a centred 480px column (FE-BPLUS-BUILD §9). */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-theme="bplus" className="min-h-svh w-full bg-background text-foreground">
      <div
        className={cn(
          "mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))]",
          className,
        )}
      >
        {children}
        <CookieBannerSpacer />
      </div>
    </div>
  );
}

/** While the cookie banner is up it's fixed over the bottom of the viewport; reserve its height
 *  so it never covers a screen's primary action (same approach as the app shells). */
export function CookieBannerSpacer() {
  const visible = useCookieConsentVisible();
  return visible ? <div aria-hidden className="shrink-0" style={{ height: "var(--cookie-banner-h, 88px)" }} /> : null;
}

/** Back (left), an optional centre slot (step dots), and an optional Skip (right). Empty sides
 *  keep a 44px spacer so the centre never shifts between steps. */
export function TopBar({ onBack, center, onSkip, backLabel = "Back" }: { onBack?: () => void; center?: ReactNode; onSkip?: () => void; backLabel?: string }) {
  return (
    <div className="flex h-14 items-center justify-between">
      {onBack ? (
        <m.button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          whileTap={press}
          transition={spring.snappy}
          className="-ml-2.5 grid size-11 place-items-center rounded-full text-foreground outline-none hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronLeft className="size-6" strokeWidth={1.75} aria-hidden />
        </m.button>
      ) : (
        <span className="size-11" aria-hidden />
      )}
      {center}
      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="-mr-2 min-h-11 rounded-full px-2 text-[15px] font-medium text-foreground/85 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          Skip
        </button>
      ) : (
        <span className="size-11" aria-hidden />
      )}
    </div>
  );
}

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("font-display-serif text-[32px] font-medium leading-[1.12] tracking-[-0.01em] text-foreground", className)}>{children}</h1>;
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-[15px] leading-relaxed text-faint", className)}>{children}</p>;
}

/** "— or —" separator between the form and Google. */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-faint" role="separator">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Line-art neighbourhood skyline with a two-line caption (auth screens' footer). */
export function SkylineFooter({ lines }: { lines: [string, string] }) {
  return (
    <div className="mt-auto pt-8" aria-hidden>
      <svg viewBox="0 0 360 64" className="w-full text-field-line" fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round">
        <path d="M0 63h360" />
        <path d="M14 63V44l12-9 12 9v19M20 63v-9h8v9" />
        <path d="M52 63V30h16v33M56 36h3M61 36h3M56 42h3M61 42h3M56 48h3M61 48h3" />
        <path d="M78 63V40c0-6 5-10 10-10s10 4 10 10v23M88 30v-6" />
        <path d="M112 63V47l9-7 9 7v16M118 63v-7h6v7" />
        <circle cx="146" cy="44" r="8" />
        <path d="M146 52v11" />
        <path d="M162 63V22h20v41M166 28h4M174 28h4M166 35h4M174 35h4M166 42h4M174 42h4M166 49h4M174 49h4" />
        <path d="M194 63V41l14-11 14 11v22M203 63v-10h10v10" />
        <path d="M232 63V34h14v29M246 63V26h18v37M250 32h3M257 32h3M250 39h3M257 39h3M250 46h3M257 46h3" />
        <circle cx="280" cy="47" r="7" />
        <path d="M280 54v9" />
        <path d="M294 63V45l11-8 11 8v18M300 63v-7h9v7" />
        <path d="M326 63V33h22v30M331 39h4M339 39h4M331 46h4M339 46h4" />
      </svg>
      <p className="mt-3 text-center text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em] text-faint">
        {lines[0]}
        <br />
        {lines[1]}
      </p>
    </div>
  );
}
