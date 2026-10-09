"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Bell, Bookmark, Briefcase, CloudOff, House, Map, MessageCircle, MessagesSquare, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArenaLogo } from "@/components/brand/ArenaLogo";
import { Avatar } from "@/components/bplus/Avatar";
import { useGuest, useOffline, useSessionName } from "@/hooks/use-arena-session";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { LocationSession } from "@/components/location/LocationSession";
import { getMyRooms } from "@/lib/api/rooms";
import "./arena.css";

const CreateSheet = dynamic(() => import("@/components/create/CreateSheet").then((mod) => mod.CreateSheet), { ssr: false });

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** Phone bottom bar (founder mockup): Feed · Discover · (+) · Chats · You. */
const TABS: { href: string; label: string; icon: Icon; match: string[] }[] = [
  { href: "/home", label: "Feed", icon: House, match: ["/home"] },
  { href: "/discover", label: "Discover", icon: Search, match: ["/discover", "/map"] },
  { href: "/rooms", label: "Chats", icon: MessageCircle, match: ["/rooms", "/messages"] },
  { href: "/identity", label: "You", icon: UserRound, match: ["/identity"] },
];

/** Desktop sidebar. Only places that exist today; the mockup's Activities, People and
 *  Communities have no page of their own yet (Activities is a feed filter). */
const SIDE: { href: string; label: string; icon: Icon; match: string[] }[] = [
  { href: "/home", label: "Home", icon: House, match: ["/home"] },
  { href: "/discover", label: "Discover", icon: Search, match: ["/discover"] },
  { href: "/map", label: "Map", icon: Map, match: ["/map"] },
  { href: "/work", label: "Jobs", icon: Briefcase, match: ["/work", "/jobs", "/applications"] },
  { href: "/rooms", label: "Messages", icon: MessagesSquare, match: ["/rooms", "/messages"] },
  { href: "/work/saved", label: "Bookmarks", icon: Bookmark, match: ["/work/saved"] },
  { href: "/identity", label: "Profile", icon: UserRound, match: ["/identity"] },
];

const isActive = (pathname: string, match: string[]) => match.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Unread chats for the signed-in person (0 for guests), shared by the top bar and both navs. */
export function useUnreadChats() {
  const guest = useGuest();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (guest !== false) return;
    let cancelled = false;
    getMyRooms()
      .then((rooms) => !cancelled && setUnread(rooms.filter((r) => r.unread).length))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guest]);
  return unread;
}

/** Desktop sidebar (from 1024px). */
export function ArenaSidebar({ unread }: { unread: number }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--shell-side)] flex-col border-r border-line bg-surface px-4 py-5 text-foreground lg:flex">
      <Link href="/home" className="px-2 text-[26px] text-foreground" aria-label="Arena home">
        <ArenaLogo />
      </Link>
      <nav aria-label="Sections" className="mt-7">
        <ul className="space-y-1">
          {SIDE.map((s) => {
            const on = isActive(pathname, s.match) && !(s.href === "/work" && pathname.startsWith("/work/saved"));
            const IconCmp = s.icon;
            return (
              <li key={s.href}>
                <Link href={s.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-primary", on ? "bg-accent font-semibold text-primary-soft" : "text-foreground hover:bg-foreground/5")}>
                  <IconCmp className="size-5" strokeWidth={on ? 2.2 : 1.75} aria-hidden />
                  <span className="flex-1">{s.label}</span>
                  {s.href === "/rooms" && unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-white">{unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/** Top bar: logo and icons on a phone; search, icons and Create on desktop. `desktopOnly` is for
 *  older screens that already have their own phone header. */
export function ArenaTopBar({ unread, onCreate, desktopOnly = false }: { unread: number; onCreate: () => void; desktopOnly?: boolean }) {
  const router = useRouter();
  const guest = useGuest();
  const name = useSessionName();
  const [query, setQuery] = useState("");
  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search");
  };
  const signIn = "/auth?mode=signin";
  const iconButton = "relative grid size-11 place-items-center rounded-full text-foreground outline-none hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-primary";
  return (
    <header className={cn("sticky top-0 z-20 border-b border-line bg-background/92 text-foreground backdrop-blur-xl", desktopOnly && "hidden lg:block")}>
      <div className="mx-auto flex h-[var(--shell-top)] max-w-[1180px] items-center gap-2 px-4 pt-[env(safe-area-inset-top)] lg:px-6">
        <Link href="/home" className="mr-auto text-[24px] text-foreground lg:hidden" aria-label="Arena home">
          <ArenaLogo />
        </Link>
        <form role="search" onSubmit={search} className="hidden h-11 flex-1 items-center gap-3 rounded-full bg-foreground/6 px-4 lg:flex">
          <Search className="size-5 text-faint" strokeWidth={1.75} aria-hidden />
          <label htmlFor="shell-search" className="sr-only">
            Quick search
          </label>
          <input id="shell-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, jobs, activities, skills..." className="h-full flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-faint" />
        </form>
        <Link href="/search" aria-label="Search" className={cn(iconButton, "lg:hidden")}>
          <Search className="size-[22px]" strokeWidth={1.75} aria-hidden />
        </Link>
        <Link href={guest ? signIn : "/rooms"} aria-label={unread ? `Chats, ${unread} unread` : "Chats"} className={iconButton}>
          <MessageCircle className="size-[22px]" strokeWidth={1.75} aria-hidden />
          {unread > 0 && <span aria-hidden className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
        </Link>
        <Link href={guest ? signIn : "/notifications"} aria-label="Notifications" className={iconButton}>
          <Bell className="size-[22px]" strokeWidth={1.75} aria-hidden />
        </Link>
        <Link href={guest ? signIn : "/identity"} aria-label={guest ? "Sign in" : "Your profile"} className="ml-1 grid size-11 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-primary">
          {guest ? <UserRound className="size-[22px]" strokeWidth={1.75} aria-hidden /> : <Avatar name={name || "You"} className="size-9 text-[13px]" />}
        </Link>
        <button type="button" onClick={onCreate} aria-haspopup="dialog" className="ml-2 hidden h-11 items-center gap-2 rounded-full bg-primary-on-paper px-5 text-[15px] font-semibold text-white outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex">
          <Plus className="size-5" strokeWidth={2.4} aria-hidden />
          Create
        </button>
      </div>
    </header>
  );
}

/**
 * The redesigned app frame. Phone: a top bar (logo, search, chats, notifications, you), the
 * content, and the bottom bar. From 1024px: a sidebar on the left, a search bar on top, and
 * room for a right rail (`aside`). Create opens the existing Create sheet.
 */
export function ArenaShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const pathname = usePathname();
  const offline = useOffline();
  const cookieBanner = useCookieConsentVisible();
  const unread = useUnreadChats();
  const [createOpen, setCreateOpen] = useState(false);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  useEffect(() => {
    const open = () => setCreateOpen(true);
    window.addEventListener("arena-open-create", open);
    const url = new URL(window.location.href);
    if (url.searchParams.has("create")) {
      url.searchParams.delete("create");
      window.history.replaceState(null, "", url.toString());
      queueMicrotask(open);
    }
    return () => window.removeEventListener("arena-open-create", open);
  }, []);

  return (
    <div data-theme="bplus" className="arena-frame arena-shell w-full bg-background text-foreground">
      {offline && (
        <p role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-[13px] font-medium text-paper-ink">
          <CloudOff className="size-4" strokeWidth={2} aria-hidden />
          You&apos;re offline. This screen will refresh when you&apos;re back.
        </p>
      )}

      <ArenaSidebar unread={unread} />

      <div className="lg:pl-[var(--shell-side)]">
        <ArenaTopBar unread={unread} onCreate={() => setCreateOpen(true)} />

        <div className="mx-auto flex w-full max-w-[1180px] gap-6 px-4 pb-[calc(var(--shell-bar)+28px+env(safe-area-inset-bottom))] pt-4 lg:px-6 lg:pb-10" style={cookieBanner ? { paddingBottom: "calc(var(--shell-bar) + 28px + var(--cookie-banner-h, 88px))" } : undefined}>
          <main className="mx-auto w-full min-w-0 max-w-[560px] lg:mx-0 lg:max-w-none lg:flex-1">
            <LocationSession />
            {children}
          </main>
          {aside && <aside className="hidden w-[320px] shrink-0 space-y-4 xl:block">{aside}</aside>}
        </div>
      </div>

      {/* Phone bottom bar */}
      <nav
        data-tone="dark"
        aria-label="Primary"
        className="fixed inset-x-0 z-40 border-t border-line bg-background/94 text-foreground backdrop-blur-xl lg:hidden"
        style={{ bottom: cookieBanner ? "var(--cookie-banner-h, 88px)" : 0, paddingBottom: cookieBanner ? 0 : "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid h-[var(--shell-bar)] max-w-[560px] grid-cols-5 items-end">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.href} tab={t} active={isActive(pathname, t.match)} />
          ))}
          <li className="flex justify-center">
            <button type="button" onClick={() => setCreateOpen(true)} aria-label="Create" aria-haspopup="dialog" aria-expanded={createOpen} className="mb-3 grid size-14 -translate-y-2 place-items-center rounded-full bg-primary text-white shadow-[0_8px_24px_-6px_var(--primary)] outline-none transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <Plus className={cn("size-7 transition-transform", createOpen && "rotate-45")} strokeWidth={2.4} aria-hidden />
            </button>
          </li>
          {TABS.slice(2).map((t) => (
            <Tab key={t.href} tab={t} active={isActive(pathname, t.match)} badge={t.href === "/rooms" ? unread : 0} />
          ))}
        </ul>
      </nav>

      {createOpen && <CreateSheet open={createOpen} onClose={closeCreate} />}
    </div>
  );
}

function Tab({ tab, active, badge = 0 }: { tab: (typeof TABS)[number]; active: boolean; badge?: number }) {
  const IconCmp = tab.icon;
  return (
    <li className="flex justify-center">
      <Link href={tab.href} aria-current={active ? "page" : undefined} aria-label={badge > 0 ? `${tab.label}, ${badge} unread` : undefined} className={cn("relative flex min-h-11 w-full flex-col items-center justify-end gap-1 pb-2.5 pt-2 text-[12px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary", active ? "text-primary" : "text-faint hover:text-foreground")}>
        <span className="relative">
          <IconCmp className="size-6" strokeWidth={active ? 2.2 : 1.75} aria-hidden />
          {badge > 0 && <span aria-hidden className="absolute -right-2 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">{badge}</span>}
        </span>
        {tab.label}
      </Link>
    </li>
  );
}
