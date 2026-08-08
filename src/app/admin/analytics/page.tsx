"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Briefcase, FileText, CalendarClock, TrendingUp } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { getPlatformAnalytics } from "@/lib/api/platformAdmin";
import { Card } from "@/components/ui/card";
import type { PlatformAnalytics } from "@/lib/types";

const TOP_METRICS = [
  { key: "tenantsTotal", label: "Tenants", icon: Building2 },
  { key: "usersTotal", label: "Users", icon: Users },
  { key: "postingsOpen", label: "Open postings", icon: Briefcase },
  { key: "applicationsTotal", label: "Applications", icon: FileText },
  { key: "interviewsTotal", label: "Interviews", icon: CalendarClock },
] as const;

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <Card>
      <p className="mb-4 font-display text-sm font-bold">{title}</p>
      <div className="space-y-3">
        {entries.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{label.replace("_", " ")}</span>
              <span className="font-semibold">{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-soft to-primary" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PlatformAnalyticsPage() {
  const gate = usePlatformAdminGate();
  const [data, setData] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    if (gate === "ready") getPlatformAnalytics().then(setData);
  }, [gate]);

  return (
    <PlatformAdminShell title="Platform analytics">
      {!data ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TOP_METRICS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="rounded-[24px] border border-border bg-white/[0.03] p-5">
                <Icon className="size-4 text-primary-soft" />
                <p className="mt-3 font-display text-2xl font-bold">{data[key]}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <Card>
            <p className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold">
              <TrendingUp className="size-4 text-primary-soft" /> Last 7 days
            </p>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span><span className="font-semibold text-foreground">{data.newTenantsLast7d}</span> new tenants</span>
              <span><span className="font-semibold text-foreground">{data.newUsersLast7d}</span> new users</span>
              <span><span className="font-semibold text-foreground">{data.tenantsSuspended}</span> tenants suspended</span>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Tenants by plan" data={data.tenantsByPlan} />
            <Breakdown title="Users by role" data={data.usersByRole} />
          </div>
        </div>
      )}
    </PlatformAdminShell>
  );
}
