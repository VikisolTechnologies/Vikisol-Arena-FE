import type { Metadata } from "next";
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
import { SentryClient } from "@/components/SentryClient";

// Self-hosted (src/app/fonts, OFL - licences alongside) rather than next/font/google: the
// Google variant downloads the fonts at build time, and Vercel builds kept failing when that
// download did ("next/font/google queries have exactly one entry"). Same families, variable
// weights, no network needed to build.
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-var.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
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
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ApiDownBanner />
        <RouteTransition />
        <PageTransition>{children}</PageTransition>
        <DeferredCommandPalette />
        <SentryClient />
        <CookieConsentBanner />
        <WebVitalsReporter />
        <BuildStamp />
      </body>
    </html>
  );
}
