"use client";

import { Home, MapPinned, Plus, Inbox, Briefcase, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChampagneAvatar } from "./ChampagneAvatar";
import { ARENA_V3 } from "./tokens";
import type { CandidateProfile } from "@/lib/types";

// ARENA-WEB-AND-SEED.md §2.2 - "Desktop: the bottom tab bar is hidden entirely. A persistent
// top header replaces it - wordmark left, primary navigation centre (Home, Map, Create, Inbox,
// Work), avatar and notifications right. Header is ivory with a 1px hairline bottom, height
// 64px, sticky. Tablet keeps the header, not the tab bar." Tailwind's default `md` breakpoint
// (768px) matches the spec's own mobile/tablet split exactly, so this and HomeTabBar's
// `md:hidden` are the only two places that breakpoint needs to be named.
const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/rooms", label: "Inbox", icon: Inbox },
  { href: "/work", label: "Work", icon: Briefcase },
];

export function HomeHeader({ profile, onCompose }: { profile: CandidateProfile | null; onCompose: () => void }) {
  const pathname = usePathname();
  return (
    <header
      className="hidden md:flex"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        height: 64,
        alignItems: "center",
        background: ARENA_V3.ivory,
        borderBottom: `1px solid ${ARENA_V3.hairline}`,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <Link href="/home" style={{ fontSize: 12, letterSpacing: 4, color: ARENA_V3.ink, fontWeight: 500 }}>
          ARENA
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: active ? ARENA_V3.ink : ARENA_V3.muted,
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon size={15} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={onCompose}
            aria-label="Create"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: ARENA_V3.ink,
              color: ARENA_V3.ivory,
              border: "none",
              cursor: "pointer",
            }}
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/notifications" aria-label="Notifications">
            <Bell size={17} strokeWidth={1.75} color={ARENA_V3.body} />
          </Link>
          <Link href="/identity" aria-label="Profile">
            <ChampagneAvatar name={profile?.name ?? "You"} sizePx={28} />
          </Link>
        </div>
      </div>
    </header>
  );
}
