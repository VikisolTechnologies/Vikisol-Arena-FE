"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowRightLeft, Briefcase, CalendarClock, Mail, Unlock } from "lucide-react";
import { rise } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Panel, Stat } from "@/components/dash/Parts";
import { getDashboard, type AdminDashboard } from "@/lib/api/companyAdmin";

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;
type Range = (typeof RANGES)[number]["id"];
const ROLE: Record<string, string> = { company_admin: "Admin", recruiter: "Recruiter", hiring_manager: "Hiring manager" };

/** Company settings — Overview (flow §8; no board — designed in B+). Same `getDashboard(range)`. */
export default function AdminDashboardPage() {
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    getDashboard(Number(range))
      .then((d) => live && (setError(false), setData(d)))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [range]);

  return (
    <CompanyAdminShell title="Overview" actions={<Pills label="Time range" options={RANGES} value={range} onChange={setRange} compact />}>
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">The overview didn&apos;t load. Try another range or refresh.</p>}
      {!data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : (
        <m.div initial="hidden" animate="shown" className="space-y-5">
          <m.div variants={rise} className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat icon={Briefcase} value={data.totals.postings} label="Jobs posted" href="/enterprise/postings" />
            <Stat icon={ArrowRightLeft} value={data.totals.stageMoves} label="Candidates moved" tone="info" />
            <Stat icon={CalendarClock} value={data.totals.interviews} label="Interviews" tone="success" />
            <Stat icon={Mail} value={data.totals.messages} label="Messages" tone="info" />
            <Stat icon={Unlock} value={data.totals.unlocks} label="Profiles unlocked" tone="warning" />
          </m.div>
          <m.div variants={rise} custom={1}>
            <Panel title="Unlock credits" action={<span className="text-[14px] text-faint">{data.creditsSpentInRange} spent in {range} days</span>}>
              <p className="text-[15px]"><strong className="font-semibold">{data.creditsBalance}</strong> of {data.creditsTotal} left</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-label="Credits left" aria-valuemin={0} aria-valuemax={data.creditsTotal} aria-valuenow={data.creditsBalance}>
                <m.div className="h-full origin-left rounded-full bg-primary" initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(1, data.creditsBalance / Math.max(1, data.creditsTotal)) }} transition={{ duration: 0.4 }} />
              </div>
            </Panel>
          </m.div>
          <m.div variants={rise} custom={2}>
            <Panel title="Team activity">
              {data.recruiterActivity.length === 0 ? (
                <StateCard kind="empty" title="No team activity yet" detail="Invite recruiters from Team to see their work here." />
              ) : (
                <div className="-mx-5 overflow-x-auto px-5" tabIndex={0} role="region" aria-label="Team activity table">
                  <table className="w-full min-w-[640px] text-left text-[14px]">
                    <thead className="text-[13px] text-faint">
                      <tr className="border-b border-line">
                        <th scope="col" className="py-2 pr-3 font-semibold">Person</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Jobs</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Moves</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Interviews</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Messages</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Unlocks</th>
                        <th scope="col" className="py-2 pl-3 text-right font-semibold">Avg. time between moves</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recruiterActivity.map((r) => (
                        <tr key={r.userId} className="border-b border-line/60 last:border-0">
                          <th scope="row" className="py-3 pr-3 font-normal"><span className="block font-semibold">{r.name}</span><span className="text-[13px] text-faint">{ROLE[r.role] ?? r.role}</span></th>
                          <td className="px-3 py-3 text-right tabular-nums">{r.postings}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.stageMoves}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.interviewsHeld}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.messagesSent}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{r.unlocks}</td>
                          <td className="py-3 pl-3 text-right tabular-nums">{r.avgHoursBetweenStageMoves != null ? `${r.avgHoursBetweenStageMoves.toFixed(1)} h` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </m.div>
        </m.div>
      )}
    </CompanyAdminShell>
  );
}
