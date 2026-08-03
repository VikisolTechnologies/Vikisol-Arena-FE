"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, ScrollText, CreditCard, Building2, ShieldCheck, LogOut, ArrowLeftRight } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/enterprise/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/enterprise/admin/team", label: "Team", icon: Users },
  { href: "/enterprise/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/enterprise/admin/billing", label: "Billing & plan", icon: CreditCard },
  { href: "/enterprise/admin/company", label: "Company profile", icon: Building2 },
  { href: "/enterprise/admin/consent", label: "Consent", icon: ShieldCheck },
];

/** CA7: company_admin can enter the recruiter workspace at any time - this shell just needs to
 * link there, the workspace routes already accept COMPANY_ADMIN (see arena-api's widened
 * @PreAuthorize, DECISIONS.md). Route guard (company_admin-only) lives here since every CA page
 * renders through this shell. */
export function CompanyAdminShell({
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
  // Starts false on both server and client so the first client render matches the SSR-ed
  // output (a lazy `typeof window` initializer was tried here first and caused a genuine
  // hydration mismatch - the server always renders null, so the client's first paint has to
  // as well). Only flips after the effect below runs, which happens post-hydration.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/auth"); return; }
    if (session.role !== "company_admin") { router.replace("/dashboard"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: this is the
    // client-only auth-gate flip itself, not a data sync side-effect the rule is meant to catch.
    setReady(true);
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (!ready) return null;

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <nav className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/enterprise/admin" className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-wide">ARENA<span className="text-primary">.</span></span>
            <Badge variant="secondary" className="bg-amber-500/12 text-[10px] text-amber-400">Admin</Badge>
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
            <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => router.push("/enterprise")}>
              <ArrowLeftRight className="size-3.5" /> Workspace
            </Button>
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
