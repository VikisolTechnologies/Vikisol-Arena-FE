"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { m } from "motion/react";
import { Briefcase, CloudOff, House, Plus, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring } from "@/lib/motion";
import { useOffline } from "@/hooks/use-arena-session";
import { useCookieConsentVisible } from "@/hooks/use-cookie-consent-visible";
import { PreviewBar } from "@/components/bplus/Primitives";
import { LocationSession } from "@/components/location/LocationSession";

const CreateSheet = dynamic(() => import("@/components/create/CreateSheet").then((mod) => mod.CreateSheet), { ssr: false });

type Icon = ComponentType<{ className?: string; strokeWidth?: number; fill?: string; fillOpacity?: number; "aria-hidden"?: boolean }>;

const TABS: { href: string; label: string; icon: Icon; match: string[] }[] = [
  { href: "/home", label: "Feed", icon: House, match: ["/home"] },
  { href: "/discover", label: "Discover", icon: Search, match: ["/discover", "/map"] },
  { href: "/work", label: "Work", icon: Briefcase, match: ["/work", "/jobs", "/applications"] },
  { href: "/identity", label: "You", icon: UserRound, match: ["/identity"] },
];

/** Height of the bar above the safe area; screens pad their content by this much. */
const BAR = 76;

/**
 * The one B+ app frame: content in a centred 480px column, a fixed bottom bar
 * (Feed · Discover · (+) · Work · You) that respects the safe area, and the Create sheet.
 * Map is Discover's map mode; Jenny is reached from Create, Feed and headers — not a tab.
 */
export function AppShell({ children, tone }: { children: ReactNode; /** Full cream page (career boards, review A6); the bottom bar stays dark. */ tone?: "light" }) {
  const pathname = usePathname();
  const offline = useOffline();
  const cookieBanner = useCookieConsentVisible();
  const [createOpen, setCreateOpen] = useState(false);
  const closeCreate = useCallback(() => setCreateOpen(false), []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollPaddingBottom;
    root.style.scrollPaddingBottom = `calc(${BAR + 24}px + env(safe-area-inset-bottom))`;
    return () => {
      root.style.scrollPaddingBottom = previous;
    };
  }, []);

  useEffect(() => {
    const open = () => setCreateOpen(true);
    window.addEventListener("arena-open-create", open);
    // "Post a need" from onboarding arrives as ?create=…; open once, then drop the param.
    const url = new URL(window.location.href);
    if (url.searchParams.has("create")) {
      url.searchParams.delete("create");
      window.history.replaceState(null, "", url.toString());
      queueMicrotask(open);
    }
    return () => window.removeEventListener("arena-open-create", open);
  }, []);

  const active = TABS.find((t) => t.match.some((p) => pathname === p || pathname.startsWith(`${p}/`)))?.href;

  return (
    <div data-theme="bplus" data-tone={tone} className="min-h-svh w-full bg-background text-foreground">
      {offline && (
        <p role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-[13px] font-medium text-paper-ink">
          <CloudOff className="size-4" strokeWidth={2} aria-hidden />
          You&apos;re offline. This screen will refresh when you&apos;re back.
        </p>
      )}
      <PreviewBar className="relative z-20 mx-auto max-w-[480px] bg-background pt-[max(6px,env(safe-area-inset-top))]" />
      <div
        className="mx-auto flex w-full max-w-[480px] flex-col overflow-y-auto overscroll-y-contain px-5 pt-[max(8px,env(safe-area-inset-top))] pb-6"
        style={{ height: `calc(100svh - ${BAR}px - env(safe-area-inset-bottom)${cookieBanner ? " - var(--cookie-banner-h, 88px)" : ""})`, scrollbarGutter: "stable" }}
      >
        <LocationSession />
        {children}
      </div>

      <nav
        data-tone="dark"
        aria-label="Primary"
        className="fixed inset-x-0 z-40 mx-auto max-w-[480px] border-t border-line bg-background/92 text-foreground backdrop-blur-xl"
        style={{ bottom: cookieBanner ? "var(--cookie-banner-h, 88px)" : 0, paddingBottom: cookieBanner ? 0 : "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 items-end" style={{ height: BAR }}>
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.href} tab={t} active={active === t.href} />
          ))}
          <li className="flex justify-center">
            <m.button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label="Create"
              aria-haspopup="dialog"
              aria-expanded={createOpen}
              whileTap={press}
              transition={spring.snappy}
              className="mb-4 grid size-14 -translate-y-2 place-items-center rounded-full bg-primary text-white shadow-[0_8px_24px_-6px_var(--primary)] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <m.span animate={{ rotate: createOpen ? 45 : 0 }} transition={spring.snappy} className="grid place-items-center">
                <Plus className="size-7" strokeWidth={2.4} aria-hidden />
              </m.span>
            </m.button>
          </li>
          {TABS.slice(2).map((t) => (
            <Tab key={t.href} tab={t} active={active === t.href} />
          ))}
        </ul>
      </nav>

      {createOpen && <CreateSheet open={createOpen} onClose={closeCreate} />}
    </div>
  );
}

function Tab({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const IconCmp = tab.icon;
  return (
    <li className="flex justify-center">
      <Link
        href={tab.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-11 w-full flex-col items-center justify-end gap-1 pb-3 pt-2 text-[12px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary",
          active ? "text-primary" : "text-faint hover:text-foreground",
        )}
      >
        {active && <m.span layoutId="tab-active" transition={spring.snappy} className="absolute top-0 h-[3px] w-8 rounded-full bg-primary" aria-hidden />}
        <IconCmp className="size-6" strokeWidth={active ? 2.2 : 1.75} fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.18 : 0} aria-hidden />
        {tab.label}
      </Link>
    </li>
  );
}
