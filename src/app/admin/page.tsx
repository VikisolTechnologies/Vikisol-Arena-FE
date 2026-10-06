"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  CheckCircle2,
  Calendar,
  Users,
  HeartHandshake,
  Briefcase,
  FileText,
  TrendingUp,
  ShieldAlert,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, MetricGrid, NoDataYet } from "@/components/admin/parts";
import { Stat } from "@/components/dash/Parts";
import { StateCard } from "@/components/bplus/Primitives";
import { getPlatformAnalytics, getPlatformDashboard } from "@/lib/api/platformAdmin";
import { formatDateTime } from "@/lib/format";
import type { PlatformAnalytics, PlatformDashboard } from "@/lib/types";

interface LaunchMetric {
  id: string;
  label: string;
  value: number | null;
  hint?: string;
}

const METRIC_ICONS: Record<string, typeof UserPlus> = {
  signups: UserPlus,
  onboarding: CheckCircle2,
  "activities-created": Calendar,
  "activities-joined": Users,
  "activities-completed": CheckCircle2,
  "needs-resolved": HeartHandshake,
  jobs: Briefcase,
  applications: FileText,
  d1: TrendingUp,
  d7: TrendingUp,
  reports: ShieldAlert,
};

export default function AdminOverviewPage() {
  const gate = usePlatformAdminGate();
  const [dashboard, setDashboard] = useState<PlatformDashboard | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (gate !== "ready") return;
    Promise.all([getPlatformDashboard(), getPlatformAnalytics()])
      .then(([d, a]) => {
        setDashboard(d);
        setAnalytics(a);
      })
      .catch(() => setError("Overview didn't load. Try again."));
  }, [gate]);

  // Metrics genuinely not tracked anywhere yet (signups funnel, D1/D7 return) show "No data yet"
  // honestly rather than a fabricated number - this used to be a hardcoded fixture (11 jobs, 64
  // applications, 2 reports, every time, regardless of the real count) shown to a real platform
  // admin; now reads the real counts where a real count exists.
  const launchMetrics: LaunchMetric[] = [
    { id: "signups", label: "Sign-ups", value: null, hint: "No data yet" },
    { id: "onboarding", label: "Onboarding completed", value: null, hint: "No data yet" },
    { id: "activities-created", label: "Activities created", value: null, hint: "No data yet" },
    { id: "activities-joined", label: "Activities joined", value: null, hint: "No data yet" },
    { id: "activities-completed", label: "Activities completed", value: null, hint: "No data yet" },
    { id: "needs-resolved", label: "Needs resolved", value: null, hint: "No data yet" },
    { id: "jobs", label: "Jobs posted", value: analytics?.postingsTotal ?? null, hint: "From platform analytics" },
    { id: "applications", label: "Applications", value: analytics?.applicationsTotal ?? null, hint: "From platform analytics" },
    { id: "d1", label: "D1 return", value: null, hint: "No data yet" },
    { id: "d7", label: "D7 return", value: null, hint: "No data yet" },
    { id: "reports", label: "Reports filed", value: dashboard?.moderationPending ?? null, hint: "Moderation queue" },
  ];

  return (
    <AdminShell title="Overview">
      {error ? (
        <StateCard kind="error" title="Couldn't load overview" detail={error} />
      ) : !dashboard ? (
        <AdminLoading />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="launch-metrics-heading">
            <h2 id="launch-metrics-heading" className="mb-4 text-[17px] font-semibold">
              Launch metrics
            </h2>
            <MetricGrid>
              {launchMetrics.map((m) => {
                const Icon = METRIC_ICONS[m.id] ?? Activity;
                if (m.value === null) {
                  return (
                    <div key={m.id} className="rounded-tile border border-dashed border-line bg-surface/50 p-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-foreground/10 text-faint">
                        <Icon className="size-5" strokeWidth={1.9} aria-hidden />
                      </span>
                      <p className="mt-3 font-display-serif text-[28px] font-medium leading-none text-faint">—</p>
                      <p className="mt-1 text-[14px] text-faint">{m.label}</p>
                      <p className="mt-2 text-[12px] text-faint">{m.hint ?? "No data yet"}</p>
                    </div>
                  );
                }
                return <Stat key={m.id} icon={Icon} value={m.value} label={m.label} tone="primary" />;
              })}
            </MetricGrid>
          </section>

          <section aria-labelledby="platform-snapshot-heading">
            <h2 id="platform-snapshot-heading" className="mb-4 text-[17px] font-semibold">
              Platform snapshot
            </h2>
            <MetricGrid>
              <Stat icon={Briefcase} value={dashboard.tenantsTotal} label="Companies" href="/admin/tenants" />
              <Stat icon={Users} value={dashboard.usersTotal} label="Users" href="/admin/users" />
              <Stat icon={ShieldAlert} value={dashboard.moderationPending} label="Reports pending" href="/admin/moderation" tone="warning" />
              <Stat icon={Activity} value={dashboard.tenantsSuspended} label="Companies suspended" tone="warning" />
            </MetricGrid>
          </section>

          <section aria-labelledby="recent-activity-heading">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="recent-activity-heading" className="text-[17px] font-semibold">
                Recent admin activity
              </h2>
              <Link href="/admin/audit" className="text-[14px] font-medium text-primary underline-offset-4 hover:underline">
                Full audit log
              </Link>
            </div>
            {dashboard.recentActivity.length === 0 ? (
              <NoDataYet label="No admin actions recorded yet." />
            ) : (
              <AdminList>
                {dashboard.recentActivity.map((e) => (
                  <AdminRow key={e.id}>
                    <div className="flex flex-wrap items-center gap-3 text-[14px]">
                      <span className="font-semibold">{e.actorName}</span>
                      <span className="text-faint">{e.action.replace(/\./g, " ")}</span>
                      {e.target && <span className="truncate text-faint">— {e.target}</span>}
                      <span className="ml-auto shrink-0 text-[12px] text-faint">{formatDateTime(e.createdAt)}</span>
                    </div>
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
