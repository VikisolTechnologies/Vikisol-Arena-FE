"use client";

import { useId, type ReactNode } from "react";
import { m } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";

/** The B+ page frame: opts into the B+ tokens, respects safe areas, and on wide screens keeps
 *  the mobile layout in a centred 480px column (FE-BPLUS-BUILD §9). */
export function Screen({ children, className, tone }: { children: ReactNode; className?: string; /** Full cream page (review A6). */ tone?: "light" }) {
  return (
    <div data-theme="bplus" data-tone={tone} className="min-h-svh w-full bg-background text-foreground">
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
  return <h1 className={cn("font-display-serif text-[34px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground", className)}>{children}</h1>;
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
/** The boards' footer drawing (review A9): a warm line-drawn neighbourhood — poplars, pitched-roof
 *  houses, a few taller blocks and rolling ground — over soft hills and a low glow. Decorative. */
export function SkylineFooter({ lines, onPaper, className }: { lines?: [string, string]; onPaper?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const hill = onPaper ? "#e3d2bd" : "#3a2c24";
  return (
    <div className={cn("mt-auto pt-6", className)} aria-hidden>
      <svg viewBox="0 0 360 118" className="w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <radialGradient id={`${id}g`} cx="0.62" cy="0.62" r="0.55">
            <stop offset="0" stopColor="#ff8a3d" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff8a3d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={hill} stopOpacity="0.9" />
            <stop offset="1" stopColor={hill} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="360" height="118" fill={`url(#${id}g)`} />
        {/* far hills */}
        <path d="M0 70c22-16 40-22 62-14 18 7 30-12 52-14 20-2 30 12 48 8 22-5 32-22 58-20 24 2 32 18 52 16 18-2 30-12 46-10 18 2 30 12 42 18v64H0z" fill={`url(#${id}h)`} />
        <g stroke={onPaper ? "#b8753f" : "#c98a55"} strokeOpacity="0.85" strokeWidth="1.3">
          {/* ground */}
          <path d="M0 96c40-10 86-14 132-10 44 4 70 12 112 8 42-4 80-14 116-12" />
          <path d="M0 108c52-8 104-8 150-4 48 4 96 6 142 0 26-3 48-6 68-6" strokeOpacity="0.55" />
          {/* left poplar with branches */}
          <path d="M22 100V34M22 34c-9 10-10 30 0 40 10-10 9-30 0-40zM22 58l-7-6M22 66l7-7M22 78l-8-6" />
          <path d="M10 98c-3-8-2-16 4-22 5 6 6 14 3 22" />
          {/* house */}
          <path d="M34 96V70l12-11 12 11v26M40 96v-9h7v9M50 78h4v4h-4zM34 70h24" />
          {/* slim tree */}
          <path d="M72 98V58M72 58c-6 7-7 20 0 27 7-7 6-20 0-27z" />
          {/* low houses */}
          <path d="M86 92V78l10-8 10 8v14M106 92V80h16v12M92 92v-6h6v6M110 84h3M116 84h3" />
          <path d="M96 64c2 3 1 5-1 6" strokeOpacity="0.5" />
          {/* tall block, centre */}
          <path d="M140 92V46h26v46M140 46l13-6 13 6M146 54h4M156 54h4M146 62h4M156 62h4M146 70h4M156 70h4M146 78h4M156 78h4M150 92v-7h6v7" />
          {/* arched house */}
          <path d="M176 92V74c0-6 4-10 9-10s9 4 9 10v18M181 92v-8a4 4 0 018 0v8" />
          <path d="M198 92V84h22v8M203 88h3M211 88h3" strokeOpacity="0.7" />
          {/* tower with antenna, right */}
          <path d="M232 90V40h24v50M244 40v-10M240 30h8M238 48h4M246 48h4M238 56h4M246 56h4M238 64h4M246 64h4M238 72h4M246 72h4" />
          <path d="M226 90V58h6M256 70h10v20" />
          {/* round tree */}
          <path d="M290 98V84M290 84l-5-5M290 88l6-5M290 70c-10 0-15 6-15 12 0 5 4 8 8 8h14c4 0 8-3 8-8 0-6-5-12-15-12z" />
          {/* leaf sprig */}
          <path d="M318 94c-2-12 4-22 14-26 1 11-4 21-14 26zM318 94l10-18" />
          <path d="M344 96V62M344 62c-5 6-6 17 0 23 6-6 5-17 0-23z" strokeOpacity="0.7" />
        </g>
        {/* a few warm windows */}
        <g fill="#ffb36b" fillOpacity="0.55">
          <rect x="156" y="62" width="4" height="4" rx="0.5" />
          <rect x="238" y="56" width="4" height="4" rx="0.5" />
          <rect x="50" y="78" width="4" height="4" rx="0.5" />
        </g>
      </svg>
      {lines && (
        <p className="mt-2 text-center text-[11px] font-medium uppercase leading-relaxed tracking-[0.22em] text-faint">
          {lines[0]}
          <br />
          {lines[1]}
        </p>
      )}
    </div>
  );
}
