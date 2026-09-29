"use client";

import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  ShieldAlert,
  Users,
  Building2,
  FileStack,
  Scale,
  Sparkles,
  BarChart3,
  ToggleLeft,
  ScrollText,
  Shield,
} from "lucide-react";
import { DashShell, type DashNavItem } from "@/components/dash/DashShell";
import NotFound from "@/app/not-found";
import { signOut } from "@/lib/api/auth";
import { usePlatformAdminGate } from "@/components/app/PlatformAdminShell";

export const ADMIN_NAV: DashNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/tenants", label: "Companies", icon: Building2 },
  { href: "/admin/content", label: "Content", icon: FileStack },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
  { href: "/admin/jenny", label: "Jenny & AI", icon: Sparkles },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/flags", label: "Feature flags", icon: ToggleLeft },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/team", label: "Admin team", icon: Shield },
];

/** B+ shell for Arena Admin (flow §9). Role gate and sign-out stay on the existing hook. */
export function AdminShell({
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
    <DashShell
      product="Admin"
      tone="admin"
      previewLabel="sample companies and people"
      nav={ADMIN_NAV}
      title={title}
      actions={actions}
      onLogout={handleLogout}
    >
      {children}
    </DashShell>
  );
}

export { usePlatformAdminGate };
