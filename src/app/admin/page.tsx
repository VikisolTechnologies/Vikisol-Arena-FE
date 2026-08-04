"use client";

import { useEffect, useState } from "react";
import { Building2, Users, ShieldAlert, Activity } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { getPlatformDashboard } from "@/lib/api/platformAdmin";
import type { PlatformDashboard } from "@/lib/types";

const METRICS = [
  { key: "tenantsTotal", label: "Tenants", icon: Building2 },
  { key: "usersTotal", label: "Users", icon: Users },
  { key: "moderationPending", label: "Moderation pending", icon: ShieldAlert },
  { key: "tenantsSuspended", label: "Tenants suspended", icon: Activity },
] as const;

export default function PlatformDashboardPage() {
  const gate = usePlatformAdminGate();
  const [dashboard, setDashboard] = useState<PlatformDashboard | null>(null);

  useEffect(() => {
    // Gated on the same role check the shell itself uses - a page's own effect otherwise fires
    // regardless of what the shell renders (see usePlatformAdminGate's doc comment).
    if (gate === "ready") getPlatformDashboard().then(setDashboard);
  }, [gate]);

  return (
    <PlatformAdminShell title="Platform dashboard">
      {!dashboard ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-[24px] border border-border bg-white/[0.03] p-5">
                <Icon className="size-4 text-primary-soft" />
                <p className="mt-3 font-display text-2xl font-bold">{dashboard[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div>
            {/* This feed is the enterprise-sales pitch surface, same idea as CA3's audit log but
                cross-tenant - see DECISIONS.md / the founder's demo note. */}
            <p className="mb-3 font-display text-sm font-bold">Recent activity across every tenant</p>
            <div className="space-y-2">
              {dashboard.recentActivity.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3 text-sm">
                  <span className="font-medium">{e.actorName}</span>
                  <span className="text-muted-foreground">{e.action}</span>
                  {e.target && <span className="truncate text-muted-foreground">— {e.target}</span>}
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {dashboard.recentActivity.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border-strong px-6 py-8 text-center text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </PlatformAdminShell>
  );
}
