"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Search, Briefcase, LogOut, Bell, Mail, Newspaper } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import type { EnterpriseProfile } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/enterprise/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/enterprise/talent", label: "Talent Universe", icon: Search },
  { href: "/enterprise/postings", label: "Postings", icon: Briefcase },
  { href: "/enterprise/posts", label: "Company Posts", icon: Newspaper },
  { href: "/enterprise/messages", label: "Messages", icon: Mail },
];

export function EnterpriseAppShell({
  title,
  actions,
  profile,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  profile?: EnterpriseProfile | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <nav className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/enterprise/dashboard" className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-wide">ARENA<span className="text-primary">.</span></span>
            <Badge variant="secondary" className="bg-white/5 text-[10px] text-muted-foreground">Enterprise</Badge>
          </Link>
          <div className="ml-4 hidden gap-1 md:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  pathname === href ? "bg-primary/12 text-primary-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {profile && (
              <span className="hidden items-center gap-1.5 rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                {profile.logoEmoji} {profile.companyName}
              </span>
            )}
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell className="size-[18px]" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={handleLogout}>
              <LogOut className="size-[18px]" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
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
