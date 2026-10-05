import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ApiDownBanner } from "@/components/ApiDownBanner";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { BuildStamp } from "@/components/BuildStamp";
import { PageTransition } from "@/components/PageTransition";
import { RouteTransition } from "@/components/RouteTransition";
import { DeferredCommandPalette } from "@/components/vnext/DeferredCommandPalette";
import { DeferredSessionExpired } from "@/components/account/DeferredSessionExpired";
import { DeferredMissingDob } from "@/components/account/DeferredMissingDob";
import { MotionProvider } from "@/components/motion/MotionProvider";

// Self-hosted (src/app/fonts, OFL - licences alongside) rather than next/font/google: the
// Google variant downloads the fonts at build time, and Vercel builds kept failing when that
// download did ("next/font/google queries have exactly one entry"). Same families, variable
// weights, no network needed to build.
// Performance pass: fonts are latin-only variable files trimmed to the weights the product uses
// (Inter 400–700, Fraunces 400–600). Space Grotesk only serves older screens, so it isn't
// preloaded on every page; the B+ fonts are, with metric-matched fallbacks (no swap shift).
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-var.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
  preload: false,
});

const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  variable: "--font-inter",
  weight: "400 700",
  display: "swap",
});

// docs/design/TOKENS.md — the B+ display serif (Arena VNext headings, hero copy). Same
// self-hosting rationale as the two fonts above (avoid the next/font/google build-time
// download failure), latin subset only, variable weight 400-600 covers the 400/500/600 the
// design actually uses.
const fraunces = localFont({
  src: "./fonts/fraunces-latin-var.woff2",
  variable: "--font-fraunces",
  weight: "400 600",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  // ARENA-INVENTORY-FIXES.md FIX 1 - needed so the new per-page OG tags on the now-public
  // profile/company routes resolve to absolute https://arena.vikisol.in URLs instead of
  // silently falling back to Next's http://localhost:3000 default when shared links preview.
  metadataBase: new URL("https://arena.vikisol.in"),
  // ARENA-WEB-AND-SEED.md Part 1.1 - "It works while you sleep" / the 24/7-autonomous-job-agent
  // pitch is the retired product this rebuild replaces. This is the fallback every route without
  // its own metadata export inherits (confirmed via grep: /home, /map, /work, /identity, /rooms
  // and every other product screen have none of their own) - fixing it here is what actually
  // reaches the browser tab on the screens the founder was looking at, not just the marketing
  // root path itself.
  title: "Arena — needs, people, activities and work nearby",
  description:
    "A network for needs, people, activities and work nearby. Jenny helps when there is something real to say.",
};

// viewport-fit=cover so env(safe-area-inset-*) works on notched phones; zoom stays enabled.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16110f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        spaceGrotesk.variable,
        inter.variable,
        fraunces.variable,
      )}
    >
      <head>
        {/* The API and the photo CDN are needed for every screen's first content: connect early. */}
        {API_ORIGIN && <link rel="preconnect" href={API_ORIGIN} crossOrigin="use-credentials" />}
        <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ApiDownBanner />
        <RouteTransition />
        <MotionProvider>
          <PageTransition>{children}</PageTransition>
        </MotionProvider>
        <DeferredCommandPalette />
        <DeferredSessionExpired />
        <DeferredMissingDob />
        <CookieConsentBanner />
        <WebVitalsReporter />
        <BuildStamp />
      </body>
    </html>
  );
}
