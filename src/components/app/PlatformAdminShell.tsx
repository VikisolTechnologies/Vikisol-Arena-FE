"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Building2, Users, ShieldAlert, BarChart3, ToggleLeft } from "lucide-react";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";
import NotFound from "@/app/not-found";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";

const NAV_ITEMS: DashNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/tenants", label: "Companies", icon: Building2 },
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
  const router = useRouter();
  const state = usePlatformAdminGate();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (state === "checking") return null;
  if (state === "denied") return <NotFound />;

  return (
    <DashShell product="Admin" tone="admin" previewLabel="sample companies and people" nav={NAV_ITEMS} title={title} actions={actions} onLogout={handleLogout}>
      {children}
    </DashShell>
  );
}
