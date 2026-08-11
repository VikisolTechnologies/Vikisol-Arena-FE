import type { Metadata } from "next";
import { Space_Grotesk, Inter, Manrope, Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { RouteTransition } from "@/components/RouteTransition";
import { PageTransition } from "@/components/PageTransition";
import { ApiDownBanner } from "@/components/ApiDownBanner";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";

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
  title: "Arena — It works while you sleep",
  description:
    "Arena is a Talent Operating System. A 24/7 AI agent hunts openings across every industry, applies with a tailored resume, and books your interviews — day and night.",
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
      </body>
    </html>
  );
}
