"use client";

import { Home, MapPinned, Plus, Inbox, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";

// Home's mobile bottom bar, re-themed for the dark/orange redesign - a fork of the shared
// HomeTabBar rather than an edit to it, since that file is also used by /map, /identity, /work
// and /rooms (all still on the light theme, out of scope for this pass). Same five
// destinations, same real routes; only the colors and the Create button's treatment changed
// (a filled orange square instead of a plain icon, matching the sidebar's one accent rule).
export function HomeMobileTabBar({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
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
      className="md:hidden"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: cookieBannerVisible ? "var(--cookie-banner-h, 88px)" : 0,
        padding: "10px 0 16px",
        paddingBottom: cookieBannerVisible ? 0 : "max(16px, env(safe-area-inset-bottom))",
        borderTop: "1px solid var(--border)",
        background: "var(--popover)",
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", maxWidth: 640, margin: "0 auto" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href != null && pathname === item.href;
          const color = active ? "var(--foreground)" : "#7a7a82";
          if (!item.href) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                aria-label={item.label}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "var(--primary)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={16} color="var(--primary-foreground)" strokeWidth={2.4} />
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
