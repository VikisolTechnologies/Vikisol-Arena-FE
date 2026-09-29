"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Briefcase, Building2, CalendarClock, LayoutDashboard, Mail, Newspaper, Search, Settings, Users } from "lucide-react";
import { DashShell, type DashNavItem, type DashTabs } from "@/components/dash/DashShell";
import { CompanyMark } from "@/components/career/CompanyMark";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";
import type { EnterpriseProfile } from "@/lib/types";

const noop = () => () => {};

const NAV: DashNavItem[] = [
  { href: "/enterprise/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/enterprise/postings", label: "Jobs", icon: Briefcase, match: ["/enterprise/postings"] },
  { href: "/enterprise/candidates", label: "Candidates", icon: Users, match: ["/enterprise/candidates"] },
  { href: "/enterprise/interviews", label: "Interviews", icon: CalendarClock, match: ["/enterprise/interviews"] },
  { href: "/enterprise/talent", label: "Talent", icon: Search, match: ["/enterprise/talent"] },
  { href: "/enterprise/messages", label: "Messages", icon: Mail },
  { href: "/enterprise/posts", label: "Company posts", icon: Newspaper },
];

/** Phone bottom bar for every business page (review A7): Home · Jobs · (+) Post · Candidates ·
 *  Company. Company is settings for admins, the company's posts for recruiters. */
export function businessTabs(isAdmin: boolean): DashTabs {
  return {
    items: [
      NAV[0],
      NAV[1],
      NAV[2],
      isAdmin
        ? { href: "/enterprise/admin", label: "Company", icon: Building2, match: ["/enterprise/admin"] }
        : { href: "/enterprise/posts", label: "Company", icon: Building2, match: ["/enterprise/posts"] },
    ],
    action: { href: "/enterprise/postings/new", label: "Post a job" },
  };
}

/** Arena for Business (flow §8) — recruiter workspace frame. Page-level role checks stay in each
 *  page (requireEnterpriseOnboarded); this shell only draws the B+ frame and signs out. */
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
  const router = useRouter();
  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };
  const isAdmin = useSyncExternalStore(noop, () => getSession()?.role === "company_admin", () => false);
  return (
    <DashShell
      product="Business"
      nav={isAdmin ? [...NAV, { href: "/enterprise/admin", label: "Company settings", icon: Settings, match: ["/enterprise/admin"] }] : NAV}
      identity={
        profile ? (
          <p className="flex items-center gap-2 rounded-xl bg-foreground/5 px-3 py-2 text-[14px]">
            <CompanyMark name={profile.companyName} className="size-7 rounded-lg text-[12px]" />
            <span className="truncate font-semibold">{profile.companyName}</span>
          </p>
        ) : null
      }
      title={title}
      actions={actions}
      onLogout={handleLogout}
      tabs={businessTabs(isAdmin)}
    >
      {children}
    </DashShell>
  );
}
