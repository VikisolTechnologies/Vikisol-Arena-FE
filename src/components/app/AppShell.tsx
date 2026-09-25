"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  MapPinned,
  MessagesSquare,
  Briefcase,
  Inbox as InboxIcon,
  Bookmark,
  Bell,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PersistentOrb } from "@/components/orb/PersistentOrb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import type { CandidateProfile } from "@/lib/types";
import { signOut } from "@/lib/api/auth";
import { getMyProfile } from "@/lib/api/profile";
import { getUnreadCount } from "@/lib/api/notifications";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { useKeyboardInset, KEYBOARD_OPEN_THRESHOLD } from "@/hooks/use-keyboard-inset";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * The one shell every talent-facing screen renders inside (Arena restructure, Phase 1).
 * Five spaces, each the single home for one kind of content:
 *   Home    /home    - the mixed feed, with an entry to Jenny assistance.
 *   Nearby  /map     - activities (time + place), and only activities.
 *   Discuss /discuss - posts/threads; post detail lives at /feed/[id].
 *   Work    /work    - jobs and bidding (Discover, Marketplace, Companies sit under it).
 *   Inbox   /rooms   - every conversation: activity rooms and direct messages.
 * Same five, same order, in the desktop sidebar and the mobile tab bar - replacing the two
 * separate nav systems (HomeHeader/HomeTabBar and this file's old Home/Discover/Map/Work set)
 * that made the app feel like two different products.
 */
type Space = { key: string; href: string; label: string; icon: LucideIcon; prefixes: string[] };

const SPACES: Space[] = [
  { key: "home", href: "/home", label: "Home", icon: Sparkles, prefixes: ["/home", "/agent"] },
  { key: "nearby", href: "/map", label: "Nearby", icon: MapPinned, prefixes: ["/map"] },
  { key: "discuss", href: "/discuss", label: "Discuss", icon: MessagesSquare, prefixes: ["/discuss", "/feed"] },
  {
    key: "work",
    href: "/work",
    label: "Work",
    icon: Briefcase,
    prefixes: ["/work", "/discover", "/jobs", "/marketplace", "/companies", "/applications", "/interviews"],
  },
  { key: "inbox", href: "/rooms", label: "Inbox", icon: InboxIcon, prefixes: ["/rooms", "/messages"] },
];

const SECONDARY_ITEMS = [
  { href: "/work/saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/identity", label: "Profile", icon: UserRound },
];

function activeSpace(pathname: string): string | null {
  // /work/saved is its own secondary item, not the Work space.
  if (pathname.startsWith("/work/saved")) return null;
  const match = SPACES.find((s) => s.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
  return match?.key ?? null;
}

function NavRow({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl py-2.5 pr-3 pl-4 text-sm font-medium transition-colors",
        active
          ? "bg-secondary text-foreground before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-[2px] before:rounded-full before:bg-foreground"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
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
  profile: profileProp,
  rightRail,
  bleed = false,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  profile?: CandidateProfile | null;
  rightRail?: React.ReactNode;
  /** Edge-to-edge content (no page padding) - for screens that lay out their own full-width
   *  surfaces, like the Nearby map. */
  bleed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current = activeSpace(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const cookieBannerVisible = useCookieConsentVisible();
  const hasUnread = getUnreadCount() > 0;
  const mobileNavRef = useRef<HTMLElement>(null);
  // The on-screen keyboard covers the bottom of the viewport exactly where the tab bar lives.
  // Only matters on /agent (the one screen with a composer that low), so it stays scoped there.
  const keyboardInset = useKeyboardInset();
  const hideNavForKeyboard = pathname === "/agent" && keyboardInset > KEYBOARD_OPEN_THRESHOLD;

  // Publishes the tab bar's real measured height so /agent can size its keyboard-safe chat
  // panel against it instead of guessing a constant.
  useEffect(() => {
    const el = mobileNavRef.current;
    if (!el) return;
    const publish = () => document.documentElement.style.setProperty("--bottom-nav-h", `${el.offsetHeight}px`);
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    publish();
    return () => observer.disconnect();
  }, []);

  // Starts false on server and first client paint (SSR has no localStorage) and flips
  // post-hydration - reading getSession() during render causes a hydration mismatch.
  const [loggedIn, setLoggedIn] = useState(false);
  // Pages that already fetch the profile pass it in; the rest get it fetched here, so the
  // account chip is right on every screen without every page having to wire it up.
  const [ownProfile, setOwnProfile] = useState<CandidateProfile | null>(null);
  useEffect(() => {
    const session = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only auth-gate flip
    setLoggedIn(!!session);
    if (session && profileProp === undefined) {
      getMyProfile().then(setOwnProfile).catch(() => {});
    }
  }, [profileProp]);
  const profile = profileProp ?? ownProfile;

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  function openCreate() {
    if (!loggedIn) {
      setSignInPromptOpen(true);
      return;
    }
    // Remount per open so a cancelled draft never resurfaces.
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  const accountBlock = (placement: "sidebar" | "sheet") =>
    loggedIn ? (
      <div className={cn("mx-3 flex items-center gap-3 rounded-xl border border-border bg-white/[0.03] px-3 py-3", placement === "sidebar" ? "mt-3" : "mt-auto")}>
        <Link href="/identity" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setMobileNavOpen(false)}>
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/15 text-primary-soft">{profile?.name?.slice(0, 1) ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.name ?? "Your profile"}</p>
            {profile?.title && <p className="truncate text-xs text-muted-foreground">{profile.title}</p>}
          </div>
        </Link>
        <Button variant="ghost" size="icon-sm" onClick={handleLogout} aria-label="Log out">
          <LogOut className="size-4" />
        </Button>
      </div>
    ) : (
      <div className={cn("mx-3 rounded-xl border border-border bg-white/[0.03] p-3", placement === "sidebar" ? "mt-3" : "mt-auto")}>
        <p className="mb-2 text-xs text-muted-foreground">Browsing as a guest</p>
        <Button size="sm" className="w-full" render={<Link href="/auth" />} nativeButton={false}>
          Sign in
        </Button>
      </div>
    );

  return (
    <div data-theme="product" className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside
          className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r border-border py-5 lg:flex"
          style={cookieBannerVisible ? { paddingBottom: "var(--cookie-banner-h, 88px)" } : undefined}
        >
          <Link href="/home" className="mb-5 flex items-center gap-2.5 px-4">
            <span className="font-display text-base font-bold tracking-wide">
              Arena<span className="text-primary">.</span>
            </span>
          </Link>
          <div className="mb-4 px-3">
            <Button variant="default" size="sm" className="w-full gap-1.5" onClick={openCreate}>
              <Plus className="size-4" /> Create
            </Button>
            {/* Search across every space - opens the Search page (activities, discussions, jobs,
                projects, companies). */}
            <Link
              href="/search"
              className={cn(
                "mt-2 flex w-full items-center gap-2 rounded-full border border-border px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground",
                pathname === "/search" && "border-ring text-foreground",
              )}
            >
              <Search className="size-4" /> Search Arena
            </Link>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-1 px-3">
            {SPACES.map((s) => (
              <NavRow key={s.key} href={s.href} label={s.label} icon={s.icon} active={current === s.key} />
            ))}
          </nav>
          <div className="my-3 border-t border-border" />
          <nav aria-label="More" className="flex flex-1 flex-col gap-1 px-3">
            {SECONDARY_ITEMS.map((item) => (
              <NavRow key={item.href} {...item} active={pathname === item.href} />
            ))}
          </nav>
          {accountBlock("sidebar")}
        </aside>

        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            {title ? (
              <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
            ) : (
              <Link href="/home" className="min-w-0 flex-1 font-display text-base font-bold tracking-wide lg:invisible">
                Arena<span className="text-primary">.</span>
              </Link>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {actions}
              <Button variant="default" size="icon-sm" className="lg:hidden" onClick={openCreate} aria-label="Create">
                <Plus className="size-4" />
              </Button>
              {pathname !== "/search" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Search"
                  className="relative before:absolute before:inset-[-6px] before:content-[''] lg:hidden"
                  render={<Link href="/search" />}
                  nativeButton={false}
                >
                  <Search className="size-[18px]" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative before:absolute before:inset-[-6px] before:content-['']"
                render={<Link href="/notifications" />}
                nativeButton={false}
              >
                <Bell className="size-[18px]" />
                {hasUnread && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />}
              </Button>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border before:absolute before:inset-[-4px] before:content-[''] lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-4" />
              </button>
            </div>
          </header>

          <div className="flex min-w-0 flex-1">
            <main className={cn("min-w-0 flex-1 pb-24 lg:pb-6", !bleed && "px-4 py-6 sm:px-6 lg:px-8")}>{children}</main>
            {rightRail && <aside className="hidden w-[320px] shrink-0 border-l border-border px-5 py-6 xl:block">{rightRail}</aside>}
          </div>
        </div>
      </div>

      {/* Mobile menu sheet - Saved, Notifications, Profile and account. A sibling of the z-10
          wrapper above (not nested in it) so its z-index competes in the same stacking context
          as the tab bar below. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[895] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div
            className="absolute right-0 top-0 flex h-full w-[280px] flex-col border-l border-border bg-background py-5"
            style={cookieBannerVisible ? { paddingBottom: "var(--cookie-banner-h, 88px)" } : undefined}
          >
            <div className="mb-6 flex items-center justify-between px-4">
              <span className="font-display text-base font-bold tracking-wide">
                Arena<span className="text-primary">.</span>
              </span>
              <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </button>
            </div>
            <nav aria-label="More" className="flex flex-col gap-1 px-3" onClick={() => setMobileNavOpen(false)}>
              {SECONDARY_ITEMS.map((item) => (
                <NavRow key={item.href} {...item} active={pathname === item.href} />
              ))}
            </nav>
            {accountBlock("sheet")}
          </div>
        </div>
      )}

      {/* Mobile tab bar - the same five spaces as the sidebar. Create lives in the top bar so
          the five spaces keep equal weight here. Clears the cookie banner while it's showing. */}
      <nav
        ref={mobileNavRef}
        aria-label="Main"
        inert={hideNavForKeyboard}
        className={cn(
          "fixed inset-x-0 z-[890] flex items-stretch justify-around border-t border-border bg-background/95 backdrop-blur-xl transition-transform duration-200 ease-out lg:hidden",
          hideNavForKeyboard && "translate-y-full motion-reduce:translate-y-0 motion-reduce:opacity-0",
        )}
        style={{
          bottom: cookieBannerVisible ? "var(--cookie-banner-h, 88px)" : 0,
          paddingBottom: cookieBannerVisible ? 0 : "env(safe-area-inset-bottom)",
        }}
      >
        {SPACES.map((s) => {
          const active = current === s.key;
          const Icon = s.icon;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}
            >
              <Icon className="size-5" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      <PersistentOrb />
      <CreateComposer key={composerSession} open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => router.refresh()} />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="post" />
    </div>
  );
}
