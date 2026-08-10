"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Newspaper,
  Users,
  Fingerprint,
  Briefcase,
  Settings,
  Menu,
  Bell,
  LogOut,
  Mail,
  MapPinned,
} from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { PersistentOrb } from "@/components/orb/PersistentOrb";
import { BottomTabBar } from "@/components/app/BottomTabBar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CandidateProfile } from "@/lib/types";
import { signOut } from "@/lib/api/auth";
import { getUnreadCount } from "@/lib/api/notifications";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { cn } from "@/lib/utils";

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase A: Feed replaces Dashboard as the default landing/home
// nav item (Dashboard itself still exists as a real page, just no longer primary nav - see
// auth/page.tsx's redirectForRole). Discover/Applications/Marketplace/Agent moved under the new
// "Work" hub (reachable from here and from Feed/Profile) rather than each getting their own
// top-level slot.
const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/rooms", label: "Rooms", icon: Users },
  { href: "/work", label: "Work", icon: Briefcase },
  { href: "/identity", label: "Identity", icon: Fingerprint },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary/12 text-primary-soft" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function CandidateAppShell({
  title,
  actions,
  profile,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  profile?: CandidateProfile | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  // The cookie banner (CookieConsentBanner) is a fixed, full-width, bottom-of-viewport overlay
  // (z-[900]) - the sidebar is h-svh with the Log out button pushed to its bottom by the nav's
  // flex-1, which lands it directly under the banner while undismissed, silently eating the
  // click (found via ARENA-DEEP-AUDIT.md's click-every-button sweep: real, reproducible - Log
  // out is completely unclickable for any first-time visitor until they dismiss the banner).
  // Reserving the banner's height as bottom padding pushes Log out back above it instead.
  const cookieBannerVisible = useCookieConsentVisible();
  // Recomputed on every render (cheap localStorage read) rather than cached in state -
  // this naturally reflects mark-read updates the instant a parent (e.g. Settings) re-renders,
  // with no extra effect/subscription plumbing needed.
  const hasUnread = getUnreadCount() > 0;

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1600px]">
        {/* desktop sidebar */}
        <aside
          className="sticky top-0 hidden h-svh w-[240px] shrink-0 flex-col border-r border-border py-5 lg:flex"
          style={cookieBannerVisible ? { paddingBottom: "var(--cookie-banner-h, 88px)" } : undefined}
        >
          <Link href="/feed" className="mb-6 flex items-center gap-2.5 px-4">
            <span className="font-display text-sm font-bold tracking-wide">
              ARENA<span className="text-primary">.</span>
            </span>
          </Link>
          <NavLinks pathname={pathname} />
          <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-3 py-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/15 text-primary-soft">
                {profile?.name?.slice(0, 1) ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.name ?? "Loading…"}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.title ?? ""}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </aside>

        {/* mobile nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-[260px] flex-col border-r border-border bg-background py-5">
              <Link href="/feed" className="mb-6 flex items-center gap-2.5 px-4">
                <span className="font-display text-sm font-bold tracking-wide">
                  ARENA<span className="text-primary">.</span>
                </span>
              </Link>
              <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
            {title && (
              <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight sm:text-xl">
                {title}
              </h1>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" render={<Link href="/settings" />} nativeButton={false}>
                <Bell className="size-[18px]" />
                {hasUnread && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />}
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
        </div>
      </div>
      <BottomTabBar />
      <PersistentOrb />
    </div>
  );
}
