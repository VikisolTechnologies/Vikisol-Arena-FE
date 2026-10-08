"use client";

import Link from "next/link";
import localFont from "next/font/local";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ArenaMark } from "@/components/brand/ArenaLogo";
import { CookieBannerSpacer } from "@/components/bplus/Screen";
import type { Session } from "@/lib/types";
import { LoginBackground } from "./LoginBackground";
import { LoginCard } from "./LoginCard";
import "./login.css";

// Self-hosted like the app's other fonts (next/font/google has broken production builds here).
// Latin variable file, OFL licence alongside. Only this screen loads it.
const playfair = localFont({
  src: "./fonts/playfair-display-latin-var.woff2",
  variable: "--font-playfair",
  weight: "400 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

type Landing = (session: Pick<Session, "role">, fromSignup: boolean) => void;

function Sprout() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 30V13" />
      <path d="M16 13c-3-1.6-4-4.6-3-8 1-1.6 2-2.6 3-3 1 .4 2 1.4 3 3 1 3.400 0 6.400-3 8Z" />
      <path d="M16 21c-4.500.5-7.500-1.500-9-6 4-.8 7.500 1 9 6Z" />
      <path d="M16 21c4.500.5 7.500-1.500 9-6-4-.8-7.500 1-9 6Z" />
      <path d="M16 28c-3.500.6-6-.8-7.500-4 3.200-.8 6 .6 7.500 4Z" />
      <path d="M16 28c3.500.6 6-.8 7.500-4-3.200-.8-6 .6-7.500 4Z" />
    </svg>
  );
}

const step = (i: number) => ({ "--i": i }) as CSSProperties;

/** Background, back button, Skip, logo and footer shared by the sign-in and recovery screens. */
export function LoginFrame({ onBack, skip = true, onSkip, compact = false, footer = true, tone = "dusk", children }: { onBack?: () => void; skip?: boolean; onSkip?: () => void; compact?: boolean; footer?: boolean; tone?: "dusk" | "warm"; children: ReactNode }) {
  return (
    <div className={`arena-login ${playfair.variable}`} data-compact={compact || undefined} data-tone={tone === "dusk" ? "dusk" : undefined}>
      <LoginBackground />
      <main className="al-frame">
        <div className="al-nav al-in" style={step(0)}>
          {onBack ? (
            <button type="button" className="al-back" aria-label="Back" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
            </button>
          ) : (
            <span />
          )}
          {onSkip && (
            <button type="button" className="al-skip" onClick={onSkip}>
              <span>
                Skip <ArrowRight size={16} aria-hidden="true" />
              </span>
            </button>
          )}
          {skip && !onSkip && (
            <Link href="/home" className="al-skip" aria-label="Skip sign-in and look around">
              <span>
                Skip <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
        <div className="al-top al-in" style={step(0)}>
          <Link href="/auth" className="al-brand" aria-label={compact ? "Arena" : "Arena. Local people. Real outcomes."}>
            <ArenaMark />
            <span>
              <span className="al-word">arena</span>
              {!compact && <span className="al-tag">Local people. Real outcomes.</span>}
            </span>
          </Link>
        </div>
        {children}
{footer && (
          <footer className="al-foot al-in" style={step(4)}>
          <Sprout />
          <p>
            Same neighbors
            <br />
            Bigger possibilities
          </p>
        </footer>
        )}
        <CookieBannerSpacer />
      </main>
    </div>
  );
}

/** The sign-in screen (`/auth?mode=signin`), built to the approved "Welcome back" mockups. */
export function LoginScreen({ onBack, onRecover, land, notice }: { onBack: () => void; onRecover: () => void; land: Landing; notice?: string }) {
  return (
    <LoginFrame onBack={onBack}>
      <header className="al-head">
        <h1 className="al-h1 al-in" style={step(1)}>
          Welcome <em>back</em>
        </h1>
        <p className="al-sub al-in" style={step(2)}>
          Sign in or join with your mobile number or email.
        </p>
      </header>
      <div className="al-in" style={step(3)}>
        <LoginCard land={land} notice={notice} onRecover={onRecover} />
      </div>
    </LoginFrame>
  );
}
