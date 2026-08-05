import type { Metadata } from "next";
import { Space_Grotesk, Inter, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
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
