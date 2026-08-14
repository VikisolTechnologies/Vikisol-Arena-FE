"use client";

import { type ReactNode, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Animator = dynamic(() => import("./OnboardingShellAnimator").then((m) => m.OnboardingShellAnimator), {
  ssr: false,
});

export function OnboardingShell({
  step,
  totalSteps,
  onBack,
  nextDisabled,
  onNext,
  nextLabel = "Continue",
  isSubmitting,
  hideFooter,
  children,
}: {
  step: number;
  totalSteps: number;
  onBack?: () => void;
  nextDisabled?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  isSubmitting?: boolean;
  hideFooter?: boolean;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // ARENA-STABILIZE.md Phase 2, G2 - found live: the Continue/Enter Arena button sits at the
  // bottom of a min-h-svh flex column, so on first run (cookie banner not yet dismissed) it
  // lands directly under CookieConsentBanner's fixed z-[900] bar and is completely untappable -
  // a dead end in the middle of signup. Same reservation pattern already used by every app
  // shell's sidebar (see use-cookie-consent-visible.ts), just missing here.
  const cookieBannerVisible = useCookieConsentVisible();

  return (
    <div className="relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-background text-foreground">
      <AuraBackground />

      {/* progress dots */}
      <div className="relative z-10 flex items-center gap-3 px-6 pt-6 sm:px-10 sm:pt-8">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-white/5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : (
          <span className="size-9" />
        )}
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full bg-white/10 transition-colors",
                i <= step && "bg-primary",
              )}
            />
          ))}
        </div>
      </div>

      {/* one-question-at-a-time content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
        <div ref={contentRef} className="w-full max-w-xl">
          {children}
          {!reduced && <Animator contentRef={contentRef} step={step} />}
        </div>
      </div>

      {!hideFooter && (
        <div
          className="relative z-10 flex justify-center px-6 pb-10 sm:px-10"
          style={cookieBannerVisible ? { paddingBottom: "calc(var(--cookie-banner-h, 88px) + 2.5rem)" } : undefined}
        >
          <Button
            variant="primary-gradient"
            size="cta-lg"
            className="w-full max-w-xl"
            disabled={nextDisabled || isSubmitting}
            onClick={onNext}
          >
            {isSubmitting ? "Working…" : nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
