"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { AnimatePresence, m } from "motion/react";
import { LogOut, Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fade, press, rise, spring } from "@/lib/motion";
import { ArenaLogo } from "@/components/brand/ArenaLogo";
import { PreviewBar } from "@/components/bplus/Primitives";

type Icon = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
export interface DashNavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Also active on these path prefixes. */
  match?: string[];
}

function isActive(pathname: string, item: DashNavItem) {
  if (pathname === item.href) return true;
  return (item.match ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Phone bottom bar (review A7): four tabs around a central action, like the consumer app. */
export interface DashTabs {
  items: [DashNavItem, DashNavItem, DashNavItem, DashNavItem];
  action: { href: string; label: string };
}

/**
 * The B+ frame for Arena for Business and Arena Admin (flow §8–§9): a desktop left nav; on phones
 * a compact top bar plus either a bottom tab bar (`tabs`, Business) or a scrolling nav (Admin).
 * Business pages are full light "paper" pages as on the recruiter board (review A6).
 * Presentational only — each app's shell keeps its own role gate, session and sign-out logic.
 */
export function DashShell({
  product,
  tone = "business",
  nav,
  identity,
  switcher,
  title,
  actions,
  onLogout,
  tabs,
  previewLabel = "a sample company and candidates",
  children,
}: {
  product: string;
  tone?: "business" | "admin";
  nav: DashNavItem[];
  identity?: ReactNode;
  switcher?: ReactNode;
  title?: string;
  actions?: ReactNode;
  onLogout: () => void;
  tabs?: DashTabs;
  previewLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const light = tone === "business";
  const badge = (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", tone === "admin" ? "bg-danger/15 text-danger-on-dark" : "bg-primary/12 text-[#8f2c05]")}>
      {product}
    </span>
  );
  return (
    <div data-theme="bplus" data-tone={light ? "light" : undefined} className="min-h-svh w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface/60 px-4 py-5 backdrop-blur lg:flex" aria-label={`${product} navigation`}>
        <Link href={nav[0]?.href ?? "/"} className="flex items-center gap-2 px-2 text-[22px] text-foreground">
          <ArenaLogo />
          {badge}
        </Link>
        {identity && <div className="mt-5 px-2">{identity}</div>}
        <nav className="mt-6 flex-1">
          <ul className="space-y-1">
            {nav.map((item) => {
              const on = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn("relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary", on ? "text-paper-ink" : "text-foreground/80 hover:bg-foreground/5 hover:text-foreground")}
                  >
                    {on && <m.span layoutId={`dash-nav-${product}`} className="absolute inset-0 rounded-xl bg-paper" aria-hidden />}
                    <item.icon className="relative size-5 shrink-0" strokeWidth={1.8} aria-hidden />
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {switcher && <div className="mb-2">{switcher}</div>}
        <button type="button" onClick={onLogout} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground">
          <LogOut className="size-5" strokeWidth={1.8} aria-hidden /> Sign out
        </button>
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 pb-2 pt-[max(10px,env(safe-area-inset-top))]">
          <Link href={nav[0]?.href ?? "/"} className="flex items-center gap-2 text-[19px]">
            <ArenaLogo />
            {badge}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {!tabs && switcher}
            {tabs ? (
              <MoreMenu nav={nav} pathname={pathname} onLogout={onLogout} label={`${product} menu`} />
            ) : (
              <button type="button" onClick={onLogout} aria-label="Sign out" className="grid size-11 place-items-center rounded-full hover:bg-foreground/5">
                <LogOut className="size-5" strokeWidth={1.8} aria-hidden />
              </button>
            )}
          </div>
        </div>
        {!tabs && (
          <nav aria-label={`${product} navigation`} className="flex gap-1.5 overflow-x-auto px-4 pb-2.5 [scrollbar-width:none]">
            {nav.map((item) => {
              const on = isActive(pathname, item);
              return (
                <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium", on ? "bg-paper text-paper-ink" : "border border-field-line text-foreground/85")}>
                  <item.icon className="size-4" strokeWidth={1.9} aria-hidden /> {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <div className="lg:ml-[248px]">
        <PreviewBar label={previewLabel} />
      </div>
      <main className={cn("px-4 pt-5 sm:px-6 lg:ml-[248px] lg:px-10 lg:pb-16 lg:pt-8", tabs ? "pb-[calc(112px+env(safe-area-inset-bottom))]" : "pb-16")}>
        <m.div initial="hidden" animate="shown" className="mx-auto max-w-[1180px]">
          {(title || actions) && (
            <m.div variants={rise} custom={0} className="mb-6 flex flex-wrap items-end justify-between gap-3">
              {title && <h1 className="font-display-serif text-[30px] font-medium leading-tight lg:text-[36px]">{title}</h1>}
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </m.div>
          )}
          <m.div variants={rise} custom={1}>{children}</m.div>
        </m.div>
      </main>

      {tabs && <BottomBar tabs={tabs} pathname={pathname} label={`${product} navigation`} />}
    </div>
  );
}

/** Phones only: Home · Jobs · (+) · Candidates · Company, dark like the consumer bar. */
function BottomBar({ tabs, pathname, label }: { tabs: DashTabs; pathname: string; label: string }) {
  const [a, b, c, d] = tabs.items;
  return (
    <nav data-tone="dark" aria-label={label} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] text-foreground backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid h-[76px] max-w-[560px] grid-cols-5 items-end">
        {[a, b].map((t) => <BarTab key={t.href} item={t} on={isActive(pathname, t)} />)}
        <li className="flex justify-center">
          <m.span whileTap={press} transition={spring} className="-mt-5 mb-3 inline-block">
            <Link href={tabs.action.href} aria-label={tabs.action.label} className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(255,90,31,0.45)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Plus className="size-7" strokeWidth={2.4} aria-hidden />
            </Link>
          </m.span>
        </li>
        {[c, d].map((t) => <BarTab key={t.href} item={t} on={isActive(pathname, t)} />)}
      </ul>
    </nav>
  );
}

function BarTab({ item, on }: { item: DashNavItem; on: boolean }) {
  return (
    <li className="flex h-full justify-center">
      <Link href={item.href} aria-current={on ? "page" : undefined} className={cn("relative flex h-full min-w-16 flex-col items-center justify-center gap-1 text-[12px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary", on ? "text-primary" : "text-foreground/75")}>
        {on && <m.span layoutId="dash-bottom-tab" className="absolute top-0 h-[3px] w-9 rounded-full bg-primary" aria-hidden />}
        <item.icon className="size-6" strokeWidth={on ? 2.1 : 1.7} aria-hidden />
        {item.label}
      </Link>
    </li>
  );
}

/** The rest of the business nav on phones (Interviews, Talent, Messages…) and Sign out. */
function MoreMenu({ nav, pathname, onLogout, label }: { nav: DashNavItem[]; pathname: string; onLogout: () => void; label: string }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !panel.current?.parentElement?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    panel.current?.querySelector("a")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} className="grid size-11 place-items-center rounded-full hover:bg-foreground/5">
        {open ? <X className="size-5" strokeWidth={1.8} aria-hidden /> : <Menu className="size-5" strokeWidth={1.8} aria-hidden />}
      </button>
      <AnimatePresence>
        {open && (
          <m.div ref={panel} role="navigation" aria-label={label} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={fade} className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border border-line bg-surface p-2 shadow-[0_16px_40px_rgba(30,23,20,0.18)]">
            <ul>
              {nav.map((item) => {
                const on = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-primary", on ? "bg-foreground/[0.06]" : "hover:bg-foreground/5")}>
                      <item.icon className="size-5 shrink-0" strokeWidth={1.8} aria-hidden /> {item.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-line pt-1">
                <button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-foreground/5">
                  <LogOut className="size-5" strokeWidth={1.8} aria-hidden /> Sign out
                </button>
              </li>
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
