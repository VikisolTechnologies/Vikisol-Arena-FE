"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { ADMIN_ACTION_LABELS, AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import { getPlatformAuditEvents } from "@/components/admin/fixtures";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { formatDateTime } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";
import type { AuditEvent } from "@/lib/types";

const SINCE = [
  { id: "all" as const, label: "All time" },
  { id: "7" as const, label: "7 days" },
  { id: "30" as const, label: "30 days" },
] as const;

export default function PlatformAuditPage() {
  const gate = usePlatformAdminGate();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [since, setSince] = useState<(typeof SINCE)[number]["id"]>("all");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (gate !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(isRealMode() ? [] : getPlatformAuditEvents());
  }, [gate]);

  const filtered = useMemo(() => {
    if (!events) return [];
    if (since === "all") return events;
    const days = Number(since);
    const cutoff = now - days * 86400000;
    return events.filter((e) => new Date(e.createdAt).getTime() >= cutoff);
  }, [events, since, now]);

  return (
    <AdminShell title="Audit log">
      {isRealMode() ? (
        <StateCard
          kind="empty"
          title="Platform audit log not connected"
          detail="Every admin action (who, what, when, why) needs GET /admin/audit — see gap #48."
        />
      ) : events === null ? (
        <AdminLoading />
      ) : (
        <>
          <p className="mb-4 text-[14px] text-faint">Who did what, when, and why — including moderation, verification and subscription changes.</p>
          <Pills options={SINCE} value={since} onChange={setSince} label="Time range" compact />
          <div className="mt-5">
            {filtered.length === 0 ? (
              <StateCard kind="empty" title="No events in this range" />
            ) : (
              <AdminList>
                {filtered.map((e) => (
                  <AdminRow key={e.id}>
                    <p className="text-[15px] font-semibold">{e.actorName}</p>
                    <p className="text-[14px] text-foreground/90">{ADMIN_ACTION_LABELS[e.action] ?? e.action}</p>
                    {e.target && <p className="text-[13px] text-faint">{e.target}</p>}
                    {e.metadata && <p className="mt-1 text-[13px] text-faint italic">Why: {e.metadata}</p>}
                    <p className="mt-2 text-[12px] text-faint">{formatDateTime(e.createdAt)}</p>
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
