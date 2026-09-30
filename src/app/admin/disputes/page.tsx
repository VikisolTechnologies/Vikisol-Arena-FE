"use client";

import { useEffect, useState } from "react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet, SlaTimer } from "@/components/admin/parts";
import { getDisputes, pushPlatformAudit, type AttendanceDispute } from "@/components/admin/fixtures";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";

const TABS = [
  { id: "open" as const, label: "Open" },
  { id: "resolved_host" as const, label: "Host upheld" },
  { id: "resolved_joiner" as const, label: "Joiner upheld" },
  { id: "expired" as const, label: "Expired" },
];

export default function DisputesPage() {
  const gate = usePlatformAdminGate();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [items, setItems] = useState<AttendanceDispute[] | null>(null);
  const [resolving, setResolving] = useState<{ item: AttendanceDispute; side: "host" | "joiner" } | null>(null);

  useEffect(() => {
    if (gate !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(isRealMode() ? [] : getDisputes());
  }, [gate]);

  const resolve = async (reason: string) => {
    if (!resolving || isRealMode()) return;
    const status = resolving.side === "host" ? "resolved_host" : "resolved_joiner";
    setItems((prev) =>
      prev?.map((d) => (d.id === resolving.item.id ? { ...d, status, note: reason } : d)) ?? null,
    );
    pushPlatformAudit({
      actorName: "Platform Admin",
      action: "dispute.resolved",
      target: resolving.item.activityTitle,
      metadata: `${status}: ${reason}`,
    });
  };

  const filtered = items?.filter((d) => d.status === tab) ?? [];

  return (
    <AdminShell title="Disputes">
      {isRealMode() ? (
        <StateCard
          kind="empty"
          title="Dispute queue not connected"
          detail="Attendance disputes (72h window) need a platform-admin endpoint."
        />
      ) : !items ? (
        <AdminLoading />
      ) : (
        <>
          <p className="mb-4 text-[14px] text-faint">
            Attendance disputes must be resolved within 72 hours of opening. Outcome disputes will use the same queue once the API exists.
          </p>
          <Pills options={TABS} value={tab} onChange={setTab} label="Dispute status" compact />
          <div className="mt-5">
            {filtered.length === 0 ? (
              <StateCard kind="empty" title="No disputes here" detail="Open attendance disputes appear with a countdown timer." />
            ) : (
              <AdminList>
                {filtered.map((item) => (
                  <AdminRow key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold">{item.activityTitle}</p>
                        <p className="text-[13px] text-faint">
                          Host: {item.hostName} · Joiner: {item.joinerName}
                        </p>
                        <p className="mt-2 text-[13px] text-faint">{item.note}</p>
                        <p className="mt-2 text-[12px] text-faint">Opened {formatDateTime(item.openedAt)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {item.status === "open" && <SlaTimer deadlineAt={item.deadlineAt} label="72h left" />}
                        <StatusPill status={item.status === "open" ? "paused" : "active"} />
                      </div>
                    </div>
                    {item.status === "open" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <DashButton variant="outline" onClick={() => setResolving({ item, side: "host" })}>
                          Uphold host…
                        </DashButton>
                        <DashButton variant="primary" onClick={() => setResolving({ item, side: "joiner" })}>
                          Uphold joiner…
                        </DashButton>
                      </div>
                    )}
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </div>
          <ReasonSheet
            open={!!resolving}
            title={resolving ? `Resolve for ${resolving.side}` : "Resolve dispute"}
            detail="Your note is stored in the audit log."
            confirmLabel="Resolve"
            tone="primary"
            onClose={() => setResolving(null)}
            onConfirm={resolve}
          />
        </>
      )}
    </AdminShell>
  );
}
