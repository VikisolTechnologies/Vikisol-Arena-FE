"use client";

import { useEffect, useState } from "react";
import { Briefcase, Unlock, ArrowRightLeft, CalendarClock, Mail, Sparkles, CreditCard } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { getDashboard, type AdminDashboard } from "@/lib/api/companyAdmin";
import { EmptyState } from "@/components/ui/empty-state";

const RANGES = [7, 30, 90];

const METRIC_ICONS = {
  postings: Briefcase, unlocks: Unlock, stageMoves: ArrowRightLeft, interviews: CalendarClock, messages: Mail,
} as const;

export default function AdminDashboardPage() {
  const [range, setRange] = useState(30);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);

  useEffect(() => {
    getDashboard(range).then(setDashboard);
  }, [range]);

  return (
    <CompanyAdminShell
      title="Admin dashboard"
      actions={
        <div className="flex gap-1 rounded-full border border-border bg-white/[0.03] p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r ? "bg-primary/15 text-primary-soft" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      }
    >
      {!dashboard ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.entries(dashboard.totals) as [keyof typeof METRIC_ICONS, number][]).map(([key, value]) => {
              const Icon = METRIC_ICONS[key];
              return (
                <div key={key} className="rounded-[24px] border border-border bg-white/[0.03] p-5">
                  <Icon className="size-4 text-primary-soft" />
                  <p className="mt-3 font-display text-2xl font-bold">{value}</p>
                  <p className="text-xs capitalize text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-display text-sm font-bold">
                <CreditCard className="size-4 text-primary-soft" /> Unlock credits
              </p>
              <span className="text-sm text-muted-foreground">
                {dashboard.creditsBalance}/{dashboard.creditsTotal} left · {dashboard.creditsSpentInRange} spent in range
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-soft to-primary"
                style={{ width: `${Math.min(100, (dashboard.creditsBalance / Math.max(1, dashboard.creditsTotal)) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <p className="mb-3 font-display text-sm font-bold">Per-recruiter activity</p>
            <div className="space-y-2.5">
              {dashboard.recruiterActivity.map((r) => (
                <div key={r.userId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
                  <div className="min-w-[140px]">
                    <p className="text-sm font-semibold">{r.name}</p>
                    <Badge variant="secondary" className="mt-0.5 bg-white/5 text-[10px] capitalize text-muted-foreground">{r.role.replace("_", " ")}</Badge>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{r.postings} postings</span>
                    <span>{r.unlocks} unlocks</span>
                    <span>{r.stageMoves} stage moves</span>
                    <span>{r.interviewsHeld} interviews</span>
                    <span>{r.messagesSent} messages</span>
                    {r.avgHoursBetweenStageMoves != null && (
                      <span className="flex items-center gap-1 text-primary-soft">
                        <Sparkles className="size-3" /> ~{r.avgHoursBetweenStageMoves.toFixed(1)}h/move
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {dashboard.recruiterActivity.length === 0 && <EmptyState title="No active team members yet." className="py-8" />}
            </div>
          </div>
        </div>
      )}
    </CompanyAdminShell>
  );
}
