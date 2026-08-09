"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Compass,
  MapPinned,
  Briefcase,
  Inbox as InboxIcon,
  Bookmark,
  Bell,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { PersistentOrb } from "@/components/orb/PersistentOrb";
import { CommandDialog, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PostComposer } from "@/components/feed/PostComposer";
import type { CandidateProfile } from "@/lib/types";
import { signOut } from "@/lib/api/auth";
import { getUnreadCount } from "@/lib/api/notifications";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { cn } from "@/lib/utils";

/**
 * ARENA-MASTER-ARCHITECTURE.md PART 4 — the new global shell. Structural rebuild for v3,
 * not a restyle of CandidateAppShell: new nav set (Home/Discover/Map/Work/Inbox — Rooms and
 * Messages fold into Inbox per PART 15 Step 7, not migrated yet so both old routes still work
 * standalone in the meantime), a right-rail slot for Home/Discover, and the PART 4-specified
 * mobile tab bar (Home · Discover · + · Map · Work, with Inbox/Profile living in the account
 * sheet instead of taking a 6th tab slot).
 *
 * Deliberately still on the CURRENT dark token set (bg-background/border-border/etc.) — the
 * ivory/champagne/gold system is PART 15 Step 2's job, applied on top of this structure, not
 * built into it. CandidateAppShell is untouched and still serves every route not yet migrated
 * to /home (see ROUTES.md) — this is additive, not a replacement of working pages.
 */
const SIDE_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/work", label: "Work", icon: Briefcase },
  { href: "/rooms", label: "Inbox", icon: InboxIcon },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/work/saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const MOBILE_TAB_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: null, label: "Post", icon: Plus }, // centre raised button, opens composer directly
  { href: "/map", label: "Map", icon: MapPinned },
  { href: "/work", label: "Work", icon: Briefcase },
];

function NavRow({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-primary/12 text-primary-soft" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {label}
    </Link>
  );
}

export function AppShell({
  title,
  actions,
  profile,
  rightRail,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  profile?: CandidateProfile | null;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  // Same cookie-banner-overlap fix CandidateAppShell already carries - see its own comment.
  const cookieBannerVisible = useCookieConsentVisible();
  const hasUnread = getUnreadCount() > 0;

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1600px]">
        {/* desktop side nav (w-248 per PART 4; icon rail on tablet is a later refinement -
            full-width nav down to lg is an acceptable interim, matches CandidateAppShell's
            own existing lg breakpoint) */}
        <aside
          className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r border-border py-5 lg:flex"
          style={cookieBannerVisible ? { paddingBottom: 88 } : undefined}
        >
          <Link href="/home" className="mb-6 flex items-center gap-2.5 px-4">
            <span className="font-display text-sm font-bold tracking-wide">
              ARENA<span className="text-primary">.</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-1 px-3">
            {SIDE_NAV_ITEMS.map((item) => (
              <NavRow key={item.href} {...item} active={pathname === item.href} />
            ))}
          </nav>
          <div className="my-3 border-t border-border" />
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <NavRow key={item.href} {...item} active={pathname === item.href} />
            ))}
          </nav>
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

        {/* mobile side nav sheet - reachable from the TopBar's menu button, carries Inbox/
            Saved/Notifications/account, since the bottom tab bar only has room for 5 items
            per PART 4's own spec ("Inbox and Profile live in the TopBar/account sheet") */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
            <div className="absolute right-0 top-0 flex h-full w-[280px] flex-col border-l border-border bg-background py-5">
              <div className="mb-6 flex items-center justify-between px-4">
                <span className="font-display text-sm font-bold tracking-wide">
                  ARENA<span className="text-primary">.</span>
                </span>
                <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                  <X className="size-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 px-3">
                {[...SIDE_NAV_ITEMS, ...SECONDARY_NAV_ITEMS].map((item) => (
                  <NavRow key={item.href} {...item} active={pathname === item.href} />
                ))}
              </nav>
              <div className="mx-3 mt-auto flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-3 py-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/15 text-primary-soft">
                    {profile?.name?.slice(0, 1) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{profile?.name ?? "Loading…"}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Log out">
                  <LogOut className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
            {title && (
              <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight sm:text-xl lg:flex-none">
                {title}
              </h1>
            )}
            {/* GlobalSearch trigger - desktop only, reuses the existing command palette
                primitive rather than a second search implementation */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] lg:flex lg:max-w-xs"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search posts, people, companies…</span>
              <kbd className="ml-auto shrink-0 rounded border border-border bg-white/5 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
              <Button
                variant="primary-gradient"
                size="sm"
                className="hidden gap-1.5 lg:inline-flex"
                onClick={() => setComposerOpen(true)}
              >
                <Plus className="size-3.5" /> Post
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" render={<Link href="/notifications" />} nativeButton={false}>
                <Bell className="size-[18px]" />
                {hasUnread && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />}
              </Button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </button>
            </div>
          </header>

          <div className="flex min-w-0 flex-1">
            <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">{children}</main>
            {rightRail && (
              <aside className="hidden w-[320px] shrink-0 border-l border-border px-5 py-6 xl:block">
                {rightRail}
              </aside>
            )}
          </div>
        </div>
      </div>

      {/* mobile bottom tab bar - Home/Discover/+/Map/Work per PART 4, distinct from the
          legacy BottomTabBar (Feed/Post/Rooms/Profile) which CandidateAppShell still uses -
          not touching that one so unmigrated routes keep working exactly as before */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[890] flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_TAB_ITEMS.map((item) => {
          if (!item.href) {
            return (
              <button
                key="post"
                type="button"
                onClick={() => setComposerOpen(true)}
                aria-label="New post"
                className="relative flex flex-1 items-center justify-center py-2"
              >
                <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Plus className="size-6" />
                </span>
              </button>
            );
          }
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                active ? "text-primary-soft" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <PersistentOrb />
      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => router.refresh()} />
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search posts, people, companies…" />
        <CommandList>
          <CommandEmpty>Global search lands with PART 15 Step 5/8 (Discover + full-text search API) — not wired yet.</CommandEmpty>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
