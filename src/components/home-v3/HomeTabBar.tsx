"use client";

import { Home, MapPinned, Plus, Inbox, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const items: { href: string | null; label: string; icon: typeof Home; onClick?: () => void }[] = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/map", label: "Map", icon: MapPinned },
    { href: null, label: "Create", icon: Plus, onClick: onCompose },
    { href: "/rooms", label: "Inbox", icon: Inbox },
    { href: "/identity", label: "Profile", icon: User },
  ];
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        display: "flex",
        justifyContent: "space-around",
        padding: "14px 0 16px",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        borderTop: `1px solid ${ARENA_V3.hairline}`,
        background: ARENA_V3.ivory,
      }}
    >
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
  );
}
