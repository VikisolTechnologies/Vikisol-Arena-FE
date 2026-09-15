"use client";

import { Home, MapPinned, Plus, Inbox, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { ARENA_V3 } from "./tokens";

// ARENA-PHASE-1-BUILD.md §2 "Structure" / §4 "Navigation" - the mockups' tab bar. Icons here
// are lucide-react (the icon set already used everywhere else in this codebase, e.g.
// AppShell.tsx's MOBILE_TAB_ITEMS) rather than the Tabler Icons the mockup renderer happened to
// use - matching the mockup's markup literally would mean adding a second icon library for
// zero visual gain (lucide already has equivalents for every icon this bar needs), which
// VIKISOL-BUILD-DOCTRINE.md §3.2 rules out ("no new dependencies unless the brief names them").
//
// Map/Inbox/Profile route to the existing, functional /map, /rooms and /identity pages - none
// of those seven screens are rebuilt yet, so tapping them lands on the current (differently
// styled) real page rather than a dead link. That's expected for this checkpoint: §5's "no dead
// buttons" rule is about function, not yet about visual consistency across screens.
export function HomeTabBar({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  // ARENA-PERF-AND-MOBILE-FIX.md's own fix for AppShell's bottom nav, reapplied here - a fixed,
  // full-width cookie banner at the bottom of the viewport otherwise sits directly on top of
  // this bar, making Map/Create/Inbox/Profile all silently unreachable for any first-time
  // visitor until they dismiss it. Found by actually looking at a screenshot before calling
  // this checkpoint done, not assumed fixed because AppShell already solved it once elsewhere.
  const cookieBannerVisible = useCookieConsentVisible();
  const items: { href: string | null; label: string; icon: typeof Home; onClick?: () => void }[] = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/map", label: "Map", icon: MapPinned },
    { href: null, label: "Create", icon: Plus, onClick: onCompose },
    { href: "/rooms", label: "Inbox", icon: Inbox },
    { href: "/identity", label: "Profile", icon: User },
  ];
  return (
    <div
      // ARENA-WEB-AND-SEED.md §2.2 - "the bottom tab bar is hidden entirely" from 768px up
      // (Tailwind's `md`), replaced by HomeHeader's persistent top nav - see its own comment.
      className="md:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: cookieBannerVisible ? "var(--cookie-banner-h, 88px)" : 0,
        padding: "14px 0 16px",
        paddingBottom: cookieBannerVisible ? 0 : "max(16px, env(safe-area-inset-bottom))",
        borderTop: `1px solid ${ARENA_V3.hairline}`,
        background: ARENA_V3.ivory,
      }}
    >
      {/* ARENA-PHASE-1-BUILD.md §2 "Structure" - same 640px-max centered measure as the hero
          text and card list; without this the icons spread edge-to-edge across a wide desktop
          viewport instead of sitting under the one content column. */}
      <div style={{ display: "flex", justifyContent: "space-around", maxWidth: 640, margin: "0 auto" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href != null && pathname === item.href;
          const color = active ? ARENA_V3.ink : ARENA_V3.inactiveTab;
          if (!item.href) {
            return (
              <button key={item.label} type="button" onClick={item.onClick} aria-label={item.label} style={{ background: "none", border: "none", padding: 0 }}>
                <Icon size={20} color={color} strokeWidth={1.75} />
              </button>
            );
          }
          return (
            <Link key={item.label} href={item.href} aria-label={item.label} style={{ display: "flex" }}>
              <Icon size={20} color={color} strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
