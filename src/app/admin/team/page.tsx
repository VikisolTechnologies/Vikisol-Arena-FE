"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import { getAdminTeam, type AdminTeamMember } from "@/components/admin/fixtures";
import { StateCard } from "@/components/bplus/Primitives";
import { Panel } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";

export default function AdminTeamPage() {
  const gate = usePlatformAdminGate();
  const [team, setTeam] = useState<AdminTeamMember[] | null>(null);

  useEffect(() => {
    if (gate !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeam(isRealMode() ? [] : getAdminTeam());
  }, [gate]);

  return (
    <AdminShell title="Admin team">
      {isRealMode() ? (
        <StateCard
          kind="empty"
          title="Admin team API not connected"
          detail="2FA status and launch-area assignments need GET /admin/team."
        />
      ) : team === null ? (
        <AdminLoading />
      ) : (
        <>
          <Panel tone="paper" className="mb-6">
            <p className="flex items-start gap-2 text-[14px] text-paper-ink">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-on-paper" aria-hidden />
              Two-factor authentication is required for every Vikisol staff account on Arena Admin. No passwords are shown here — ever.
            </p>
          </Panel>
          <section aria-labelledby="launch-areas-heading">
            <h2 id="launch-areas-heading" className="mb-3 text-[17px] font-semibold">
              Launch areas
            </h2>
            <p className="mb-4 text-[14px] text-faint">Gachibowli · Gopanapally — expand as new neighbourhoods go live.</p>
          </section>
          {team.length === 0 ? (
            <StateCard kind="empty" title="No admin accounts listed" />
          ) : (
            <AdminList>
              {team.map((m) => (
                <AdminRow key={m.id}>
                  <p className="text-[15px] font-semibold">{m.name}</p>
                  <p className="text-[13px] text-faint">{m.email}</p>
                  <p className="mt-2 text-[13px] text-faint">
                    2FA: {m.twoFactorEnabled ? "On" : "Off — must enable before next sign-in"}
                  </p>
                  <p className="text-[13px] text-faint">Areas: {m.launchAreas.join(", ")}</p>
                  <p className="mt-2 text-[12px] text-faint">Last active {formatDateTime(m.lastActiveAt)}</p>
                </AdminRow>
              ))}
            </AdminList>
          )}
        </>
      )}
    </AdminShell>
  );
}
