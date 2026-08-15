"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Building2, Users, ShieldAlert, BarChart3, ToggleLeft, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NotFound from "@/app/not-found";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Tenants", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/flags", label: "Feature flags", icon: ToggleLeft },
];

/** PA7: platform_admin-only, and a failed check renders a real 404 (not a redirect elsewhere) -
 * a redirect to /dashboard or /auth would still confirm to a curious visitor that "/admin" is a
 * real, gated route. Reusing the exact not-found.tsx a genuinely nonexistent URL renders gives
 * no such signal. Server-side, every /admin/** call is separately gated by
 * @PreAuthorize("hasRole('PLATFORM_ADMIN')") (a plain 403 there is fine - that's an API
 * response, not a page a human browses to). See DECISIONS.md's "most dangerous surface" note.
 *
 * Exported so every /admin/** page can gate its OWN data-fetch effect on this too, not just
 * what the shell renders - a page's `useEffect` runs the moment that page component mounts,
 * completely independent of whatever <PlatformAdminShell> around it decides to render, so
 * without this a wrong-role visitor's browser would still fire a real request to
 * GET /admin/dashboard (etc.) before the shell's own check ever resolves. Server-side
 * @PreAuthorize rejects it either way (no data leaks), but a stray authenticated-looking
 * request to the platform console's API is exactly the kind of noise this surface shouldn't
 * make - found live-testing PA7 with a signed-in wrong-role session, not hypothetical. */
export function usePlatformAdminGate(): "checking" | "ready" | "denied" {
  const [state, setState] = useState<"checking" | "ready" | "denied">("checking");
  useEffect(() => {
    const session = getSession();
    // Deliberate: this is the client-only auth-gate flip itself, not a data sync side-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(session && session.role === "platform_admin" ? "ready" : "denied");
  }, []);
  return state;
}

export function PlatformAdminShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const state = usePlatformAdminGate();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (state === "checking") return null;
  if (state === "denied") return <NotFound />;

  return (
    <div data-theme="product" className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <nav className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-wide">ARENA<span className="text-primary">.</span></span>
            <Badge variant="secondary" className="bg-red-500/12 text-[10px] text-red-400">Platform</Badge>
          </Link>
          <div className="ml-4 hidden gap-1 lg:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors",
                  pathname === href ? "bg-primary/12 text-primary-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={handleLogout}>
              <LogOut className="size-[18px]" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                pathname === href ? "bg-primary/12 text-primary-soft" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3" /> {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {title && <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
