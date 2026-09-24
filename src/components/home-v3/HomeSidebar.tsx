"use client";

import { Home, Compass, Store, MapPinned, Inbox } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChampagneAvatar } from "./ChampagneAvatar";
import type { CandidateProfile } from "@/lib/types";

// Home's persistent left shell (desktop only, md+) - replaces HomeHeader's top nav bar for
// this one screen. Deliberately a new, separate component rather than editing HomeHeader.tsx:
// that file is shared by /map, /identity, /work, /rooms and /feed/[id] (none of which are in
// scope for this pass), so it has to stay exactly as it is.
//
// Routes: "Jobs" points at /discover (the real swipe-through-matches page, already
// guest-browsable) rather than /work (which shows "what you're already in" - bids, interviews,
// rooms - and requires a session), since a sidebar link needs to work for a browsing visitor
// too. "Bidding"/"Map"/"Messages" map onto the real /marketplace, /map and /rooms routes
// directly - no invented destinations. There's no separate "Discussions" entry: Home's own feed
// already is the discussions surface, a second nav item pointing at the same content would be
// redundant rather than a real second place to go.
const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Jobs", icon: Compass },
  { href: "/marketplace", label: "Bidding", icon: Store },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/rooms", label: "Messages", icon: Inbox },
];

export function HomeSidebar({ profile, signedIn }: { profile: CandidateProfile | null; signedIn: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 260,
        flexShrink: 0,
        height: "100dvh",
        position: "sticky",
        top: 0,
        background: "var(--popover)",
        borderRight: "1px solid var(--border)",
        flexDirection: "column",
        padding: "24px 18px",
        boxSizing: "border-box",
      }}
    >
      <Link href="/home" className="font-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.5, color: "var(--foreground)", padding: "0 6px" }}>
        Arena<span style={{ color: "var(--primary)" }}>.</span>
      </Link>

      {/* Jenny - a real, honestly-disabled preview of the AI entry point, not a working
          feature yet. Arena doesn't have a conversational backend wired up (JennySol is a
          separate, not-yet-connected service in the ecosystem) - a fake-working input here
          would be worse than an honest "coming soon". */}
      <div style={{ marginTop: 24, padding: 14, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: 999, background: "radial-gradient(circle, rgba(255,107,53,0.35), transparent 70%)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: "radial-gradient(circle at 32% 30%, var(--primary-soft), var(--primary) 70%)" }} />
          <span style={{ fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>Hi, I&apos;m Jenny</span>
        </div>
        <input
          type="text"
          disabled
          placeholder="Ask me anything…"
          aria-label="Ask Jenny (coming soon)"
          style={{
            position: "relative",
            width: "100%",
            boxSizing: "border-box",
            background: "rgba(0,0,0,0.35)",
            border: "none",
            borderRadius: 999,
            padding: "10px 14px",
            fontSize: 11.5,
            color: "var(--faint)",
            cursor: "not-allowed",
          }}
        />
        <p style={{ position: "relative", margin: "8px 0 0", fontSize: 10, color: "var(--faint)" }}>Coming soon</p>
      </div>

      <p style={{ margin: "24px 0 10px", padding: "0 6px", fontSize: 9.5, letterSpacing: 2.5, color: "var(--faint)" }}>MENU</p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                gap: 11,
                padding: "10px 12px",
                borderRadius: 10,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: active ? "2px solid var(--foreground)" : "2px solid transparent",
              }}
            >
              <Icon size={17} strokeWidth={1.7} color={active ? "var(--foreground)" : "#7a7a82"} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: active ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: active ? 600 : 400 }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <Link
        href={signedIn ? "/identity" : "/auth"}
        style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border)" }}
      >
        <ChampagneAvatar name={profile?.name ?? "You"} sizePx={30} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>{profile?.name ?? "Guest"}</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--faint)" }}>{signedIn ? "View profile" : "Sign in to save your picks"}</p>
        </div>
      </Link>
    </aside>
  );
}
