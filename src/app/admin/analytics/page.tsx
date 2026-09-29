"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Briefcase, FileText, CalendarClock, TrendingUp } from "lucide-react";
import { m } from "motion/react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminLoading } from "@/components/admin/parts";
import { Panel, Stat } from "@/components/dash/Parts";
import { StateCard } from "@/components/bplus/Primitives";
import { fade, rise } from "@/lib/motion";
import { getPlatformAnalytics } from "@/lib/api/platformAdmin";
import type { PlatformAnalytics } from "@/lib/types";

const TOP_METRICS = [
  { key: "tenantsTotal", label: "Companies", icon: Building2 },
  { key: "usersTotal", label: "Users", icon: Users },
  { key: "postingsOpen", label: "Open jobs", icon: Briefcase },
  { key: "applicationsTotal", label: "Applications", icon: FileText },
  { key: "interviewsTotal", label: "Interviews", icon: CalendarClock },
] as const;

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {entries.map(([label, value], i) => (
          <m.div key={label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...fade, delay: i * 0.04 }}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="capitalize text-faint">{label.replace(/_/g, " ")}</span>
              <span className="font-semibold">{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <m.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(value / max) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </m.div>
        ))}
      </div>
    </Panel>
  );
}

export default function PlatformAnalyticsPage() {
  const gate = usePlatformAdminGate();
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (gate !== "ready") return;
    getPlatformAnalytics()
      .then(setData)
      .catch(() => setError("Analytics didn't load."));
  }, [gate]);

  return (
    <AdminShell title="Analytics">
      {error ? (
        <StateCard kind="error" title="Couldn't load analytics" detail={error} />
      ) : !data ? (
        <AdminLoading />
      ) : (
        <m.div initial="hidden" animate="shown" className="space-y-6">
          <m.div variants={rise} custom={0} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {TOP_METRICS.map(({ key, label, icon }) => (
              <Stat key={key} icon={icon} value={data[key]} label={label} />
            ))}
          </m.div>

          <m.div variants={rise} custom={1}>
            <Panel title="Last 7 days">
              <p className="flex flex-wrap items-center gap-2 text-[14px] text-faint">
                <TrendingUp className="size-4 text-primary" aria-hidden />
                <span>
                  <strong className="text-foreground">{data.newTenantsLast7d}</strong> new companies
                </span>
                <span aria-hidden>·</span>
                <span>
                  <strong className="text-foreground">{data.newUsersLast7d}</strong> new users
                </span>
                <span aria-hidden>·</span>
                <span>
                  <strong className="text-foreground">{data.tenantsSuspended}</strong> companies suspended
                </span>
              </p>
            </Panel>
          </m.div>

          <m.div variants={rise} custom={2} className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Companies by plan" data={data.tenantsByPlan} />
            <Breakdown title="Users by role" data={data.usersByRole} />
          </m.div>
        </m.div>
      )}
    </AdminShell>
  );
}
