"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, ScrollText, CreditCard, Building2, ShieldCheck, ArrowLeftRight } from "lucide-react";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";
import { businessTabs } from "@/components/app/EnterpriseAppShell";
import NotFound from "@/app/not-found";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";

const NAV_ITEMS: DashNavItem[] = [
  { href: "/enterprise/admin", label: "Overview", icon: LayoutDashboard },
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
  const router = useRouter();
  // Starts "checking" on both server and client so the first client render matches the SSR-ed
  // output (a lazy `typeof window` initializer was tried here first and caused a genuine
  // hydration mismatch - the server always renders null, so the client's first paint has to
  // as well). Only flips after the effect below runs, which happens post-hydration.
  const [state, setState] = useState<"checking" | "ready" | "denied">("checking");

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/auth"); return; }
    // ARENA-INVENTORY-FIXES.md FIX 2 - was router.replace("/dashboard"), a route ROUTES.md
    // itself calls fully retired, which then bounced non-candidate sessions into the candidate
    // onboarding wizard via /dashboard's own requireOnboarded() check. Renders the branded 404
    // in place instead, matching PlatformAdminShell's already-proven pattern for this exact
    // problem (see its own PA7 comment for why 404 over a redirect).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only auth-gate flip
    setState(session.role === "company_admin" ? "ready" : "denied");
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (state === "checking") return null;
  if (state === "denied") return <NotFound />;

  return (
    <DashShell
      product="Business"
      nav={NAV_ITEMS}
      switcher={
        <Link href="/enterprise" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-semibold text-foreground/80 hover:bg-foreground/5">
          <ArrowLeftRight className="size-4" aria-hidden /> <span className="whitespace-nowrap"><span className="sr-only sm:not-sr-only">Recruiting </span>workspace</span>
        </Link>
      }
      title={title}
      actions={actions}
      onLogout={handleLogout}
      tabs={businessTabs(true)}
    >
      {children}
    </DashShell>
  );
}
