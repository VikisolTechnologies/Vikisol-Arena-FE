"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { m } from "motion/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { ArenaLogo } from "@/components/brand/ArenaLogo";

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

/**
 * The B+ frame for Arena for Business and Arena Admin (flow §8–§9): a desktop left nav, a compact
 * top bar + scrolling nav on phones. Presentational only — each app's shell keeps its own role
 * gate, session and sign-out logic unchanged.
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
  children: ReactNode;
}) {
  const pathname = usePathname();
  const badge = (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", tone === "admin" ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary")}>
      {product}
    </span>
  );
  return (
    <div data-theme="bplus" className="min-h-svh w-full bg-background text-foreground">
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
            {switcher}
            <button type="button" onClick={onLogout} aria-label="Sign out" className="grid size-11 place-items-center rounded-full hover:bg-foreground/5">
              <LogOut className="size-5" strokeWidth={1.8} aria-hidden />
            </button>
          </div>
        </div>
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
      </header>

      <main className="px-4 pb-16 pt-5 sm:px-6 lg:ml-[248px] lg:px-10 lg:pt-8">
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
    </div>
  );
}
