"use client";

import { useEffect, useState } from "react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet, SlaTimer } from "@/components/admin/parts";
import { getDisputes, pushPlatformAudit, type AttendanceDispute } from "@/components/admin/fixtures";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { getDisputeQueue, resolveDispute, type DisputeView } from "@/lib/api/platformAdmin";
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
  const [items, setItems] = useState<(AttendanceDispute | DisputeView)[] | null>(null);
  const [resolving, setResolving] = useState<{ item: AttendanceDispute | DisputeView; side: "host" | "joiner" } | null>(null);

  const [error, setError] = useState("");

  const load = () => {
    if (isRealMode()) {
      setItems(null);
      getDisputeQueue(tab).catch(() => {
        setError("The dispute queue didn't load. Refresh to try again.");
        return [];
      }).then(setItems);
      return;
    }
    setItems(getDisputes());
  };

  useEffect(() => {
    if (gate !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, tab]);

  const resolve = async (reason: string) => {
    if (!resolving) return;
    const status = resolving.side === "host" ? "resolved_host" : "resolved_joiner";
    if (isRealMode()) {
      await resolveDispute(resolving.item.id, resolving.side, reason);
      load();
      return;
    }
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

  const statusOf = (d: AttendanceDispute | DisputeView) => ("state" in d ? d.state : d.status);
  const filtered = isRealMode() ? items ?? [] : items?.filter((d) => statusOf(d) === tab) ?? [];

  return (
    <AdminShell title="Disputes">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!items ? (
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
                        {statusOf(item) === "open" && <SlaTimer deadlineAt={item.deadlineAt} label="72h left" />}
                        <StatusPill status={statusOf(item) === "open" ? "paused" : "active"} />
                      </div>
                    </div>
                    {statusOf(item) === "open" && (
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
