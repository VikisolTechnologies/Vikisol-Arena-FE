"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { rise } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Panel } from "@/components/dash/Parts";
import { getConsentView, type ConsentEntry } from "@/lib/api/companyAdmin";
import { shortDate } from "@/lib/data/time";

/** Company settings — Consent & data retention (flow §8; no board — designed in B+). */
export default function ConsentPage() {
  const [entries, setEntries] = useState<ConsentEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getConsentView().then(setEntries).catch(() => { setError(true); setEntries([]); });
  }, []);

  return (
    <CompanyAdminShell title="Consent & data">
      <m.div initial="hidden" animate="shown" className="space-y-5">
        <m.div variants={rise} className="grid gap-3 sm:grid-cols-2">
          <p className="flex gap-3 rounded-tile border border-line bg-surface p-4 text-[15px]"><ShieldCheck className="size-5 shrink-0 text-success-on-dark" aria-hidden /><span><strong className="font-semibold">Consent first.</strong> <span className="text-faint">If someone stops sharing their career with companies, their unlocked details disappear from your workspace straight away.</span></span></p>
          <p className="flex gap-3 rounded-tile border border-line bg-surface p-4 text-[15px]"><Trash2 className="size-5 shrink-0 text-faint" aria-hidden /><span><strong className="font-semibold">Kept for 12 months.</strong> <span className="text-faint">Candidate data is deleted 12 months after a role closes.</span></span></p>
        </m.div>
        {error && <p role="alert" className="rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">This list didn&apos;t load. Refresh to try again.</p>}
        <m.div variants={rise} custom={1}>
          {!entries ? (
            <Skeleton className="h-48" />
          ) : entries.length === 0 ? (
            !error && <StateCard kind="empty" title="No profiles unlocked yet" detail="People you unlock in Talent appear here with their consent status." />
          ) : (
            <Panel title="Unlocked profiles">
              <ul className="divide-y divide-line">
                {entries.map((e) => (
                  <li key={e.candidateId} className="flex items-center gap-3 py-3">
                    <Avatar name={e.candidateName} className="size-10 text-[14px]" />
                    <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{e.candidateName}</span><span className="text-[13px] text-faint">Unlocked {shortDate(e.unlockedAt, true)}</span></span>
                    {e.stillConsenting ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[12px] font-semibold text-success-on-dark"><ShieldCheck className="size-3.5" aria-hidden /> Sharing</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2.5 py-0.5 text-[12px] font-semibold text-danger-on-dark"><ShieldAlert className="size-3.5" aria-hidden /> Withdrawn</span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </m.div>
      </m.div>
    </CompanyAdminShell>
  );
}
