"use client";

import { useEffect, useState } from "react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import {
  getAiProviders,
  getJennyActionLog,
  getJennyAutomations,
  getJennyCoverFlags,
  type JennyAutomationRow,
  type JennyCoverFlag,
} from "@/components/admin/fixtures";
import { StateCard } from "@/components/bplus/Primitives";
import { Panel, Row, StatusPill } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";
import type { AuditEvent } from "@/lib/types";

function automationStatus(row: JennyAutomationRow) {
  if (row.status === "running") return "active";
  if (row.status === "failed") return "suspended";
  return "paused";
}

export default function JennyOversightPage() {
  const gate = usePlatformAdminGate();
  const [automations, setAutomations] = useState<JennyAutomationRow[] | null>(null);
  const [covers, setCovers] = useState<JennyCoverFlag[] | null>(null);
  const [providers, setProviders] = useState<ReturnType<typeof getAiProviders> | null>(null);
  const [log, setLog] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    if (gate !== "ready") return;
    if (isRealMode()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutomations([]);
      setCovers([]);
      setProviders([]);
      setLog([]);
      return;
    }
    setAutomations(getJennyAutomations());
    setCovers(getJennyCoverFlags());
    setProviders(getAiProviders());
    setLog(getJennyActionLog());
  }, [gate]);

  const loading = automations === null;

  return (
    <AdminShell title="Jenny & AI oversight">
      {isRealMode() ? (
        <StateCard
          kind="empty"
          title="Jenny oversight not connected"
          detail="Automations, approvals, failures, cover flags and provider status need platform-admin endpoints."
        />
      ) : loading ? (
        <AdminLoading />
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="providers-heading">
            <h2 id="providers-heading" className="mb-3 text-[17px] font-semibold">
              Provider status
            </h2>
            <AdminList>
              {providers!.map((p) => (
                <AdminRow key={p.name}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold">{p.name}</p>
                      <p className="text-[13px] text-faint">{p.detail}</p>
                    </div>
                    <StatusPill status={p.reachable ? "active" : "suspended"} />
                  </div>
                </AdminRow>
              ))}
            </AdminList>
          </section>

          <section aria-labelledby="automations-heading">
            <h2 id="automations-heading" className="mb-3 text-[17px] font-semibold">
              Automations
            </h2>
            {automations!.length === 0 ? (
              <StateCard kind="empty" title="No automations" />
            ) : (
              <AdminList>
                {automations!.map((a) => (
                  <AdminRow key={a.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold">{a.label}</p>
                        {a.lastRunAt && <p className="text-[13px] text-faint">Last run {formatDateTime(a.lastRunAt)}</p>}
                        {a.failureReason && <p className="text-[13px] text-danger-on-dark">{a.failureReason}</p>}
                      </div>
                      <StatusPill status={automationStatus(a)} />
                    </div>
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </section>

          <section aria-labelledby="covers-heading">
            <h2 id="covers-heading" className="mb-3 text-[17px] font-semibold">
              Generated covers
            </h2>
            {covers!.length === 0 ? (
              <Panel title="No flagged covers">All clear — nothing flagged for review.</Panel>
            ) : (
              <AdminList>
                {covers!.map((c) => (
                  <AdminRow key={c.id}>
                    <p className="text-[15px] font-semibold">{c.activityTitle}</p>
                    <p className="text-[13px] text-faint">{c.reason}</p>
                    <p className="mt-1 text-[12px] text-faint">Flagged {formatDateTime(c.flaggedAt)}</p>
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </section>

          <section aria-labelledby="ai-log-heading">
            <h2 id="ai-log-heading" className="mb-3 text-[17px] font-semibold">
              AI action log
            </h2>
            {log!.length === 0 ? (
              <StateCard kind="empty" title="No AI actions yet" />
            ) : (
              <div className="space-y-1">
                {log!.map((e) => (
                  <Row
                    key={e.id}
                    title={e.action.replace(/\./g, " ")}
                    meta={`${e.target ?? ""} · ${formatDateTime(e.createdAt)}`}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
