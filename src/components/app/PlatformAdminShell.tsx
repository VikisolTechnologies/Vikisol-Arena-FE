"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LayoutDashboard, Building2, Users, ShieldAlert, BarChart3, ToggleLeft, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import NotFound from "@/app/not-found";
import { signOut, getAccount, setupTotp, enableTotp } from "@/lib/api/auth";
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
export function usePlatformAdminGate(): "checking" | "ready" | "enroll" | "denied" {
  const [state, setState] = useState<"checking" | "ready" | "enroll" | "denied">("checking");
  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "platform_admin") {
      setState("denied");
      return;
    }
    let cancelled = false;
    getAccount()
      .then((account) => {
        if (!cancelled) setState(account.totpEnabled ? "ready" : "enroll");
      })
      .catch(() => {
        if (!cancelled) setState("enroll");
      });
    return () => {
      cancelled = true;
    };
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
  if (state === "enroll") return <PlatformAdminEnroll />;

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

function PlatformAdminEnroll() {
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setupTotp()
      .then((result) => {
        if (!cancelled) setSecret(result.secret);
      })
      .catch(() => {
        if (!cancelled) setError("Could not start two-factor setup. Sign in again and retry.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnable = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await enableTotp(code.trim());
      window.location.assign("/admin");
    } catch {
      setError("That code didn't match. Check the authenticator and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div data-theme="product" className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
      <form onSubmit={handleEnable} className="w-full max-w-md space-y-4 rounded-[24px] border border-border bg-secondary p-6">
        <h1 className="font-display text-xl font-bold">Turn on two-factor authentication</h1>
        <p className="text-sm text-muted-foreground">
          Platform admin stays locked until an authenticator app has a code for this account. Add the secret below, then enter the current code.
        </p>
        {secret && (
          <div>
            <Label htmlFor="totp-secret">Authenticator secret</Label>
            <p id="totp-secret" className="mt-2 break-all rounded-2xl border border-border bg-background px-3 py-2 font-mono text-sm">
              {secret}
            </p>
          </div>
        )}
        <div>
          <Label htmlFor="totp-code">Code</Label>
          <Input id="totp-code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="mt-2" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={submitting || code.trim().length < 6} className="w-full">
          {submitting ? "Checking…" : "Enable and continue"}
        </Button>
      </form>
    </div>
  );
}
