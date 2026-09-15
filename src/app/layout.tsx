import type { Metadata } from "next";
import { Space_Grotesk, Inter, Manrope, Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { RouteTransition } from "@/components/RouteTransition";
import { PageTransition } from "@/components/PageTransition";
import { ApiDownBanner } from "@/components/ApiDownBanner";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { BuildStamp } from "@/components/BuildStamp";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// ARENA-DESIGN-SYSTEM.md §3 - the product theme's body/UI typeface (Space Grotesk stays on
// the marketing hero only, per that doc's own carve-out). Loaded alongside the existing three
// rather than replacing them, since the marketing routes aren't migrating off Space Grotesk/
// Inter/Manrope in this pass.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  title: "Arena — Real things happening near you",
  description:
    "Arena is where your city shows up: join activities, ask for help, find work, and build a real track record of following through.",
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
        manrope.variable,
        poppins.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <ApiDownBanner />
        <RouteTransition />
        <PageTransition>{children}</PageTransition>
        <CommandPalette />
        <CookieConsentBanner />
        <WebVitalsReporter />
        <BuildStamp />
      </body>
    </html>
  );
}
