"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, PlusCircle, Users, Fingerprint, MapPinned } from "lucide-react";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { cn } from "@/lib/utils";

// First fixed-bottom-stacking situation in this app. CookieConsentBanner is also
// `fixed inset-x-0 bottom-0` (z-[900]) - stacking this tab bar at the same bottom-0 with a lower
// z-index would hide it completely behind the banner for every first-time visitor, the exact
// same class of bug ARENA-DEEP-AUDIT.md found and fixed for the desktop sidebar's Log-out button.
// Fixed the same way: shift this bar up above the banner's height while it's visible, rather than
// letting it render underneath. CandidateAppShell reserves matching bottom padding on <main>.
// "Post" deliberately has no matchHref - it's a momentary action (opens the composer on /feed),
// not a persistent view, so it never shows as the active tab even while sitting on /feed.
const TABS = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/feed?compose=1", label: "Post", icon: PlusCircle },
  { href: "/rooms", label: "Rooms", icon: Users },
  { href: "/identity", label: "Profile", icon: Fingerprint },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const cookieBannerVisible = useCookieConsentVisible();

  return (
    <nav
      className="fixed inset-x-0 z-[890] flex items-stretch justify-around border-t border-border bg-background/90 backdrop-blur-xl lg:hidden"
      style={{
        // ARENA-PERF-AND-MOBILE-FIX.md Track A - was a hardcoded 88px guess, which undershot the
        // banner's real ~115px height at mobile widths (its text wraps to 2 lines there) and let
        // the banner cover this bar anyway. CookieConsentBanner now measures and publishes its
        // own real height via this var, so the reservation is correct at every viewport width.
        bottom: cookieBannerVisible ? "var(--cookie-banner-h, 88px)" : 0,
        paddingBottom: cookieBannerVisible ? 0 : "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-primary-soft" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
