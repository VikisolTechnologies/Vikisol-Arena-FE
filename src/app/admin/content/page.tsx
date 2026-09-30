"use client";

import { useEffect, useState } from "react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet } from "@/components/admin/parts";
import { getAdminContent, pushPlatformAudit, type AdminContentItem } from "@/components/admin/fixtures";
import { KindChip, Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { formatDateTime } from "@/lib/format";
import { isRealMode } from "@/lib/api/mode";

const KIND_FILTER = [
  { id: "all" as const, label: "All" },
  { id: "activity" as const, label: "Activities" },
  { id: "need" as const, label: "Needs" },
  { id: "job" as const, label: "Jobs" },
];

const KIND_TO_CHIP: Record<AdminContentItem["kind"], string> = {
  activity: "activity",
  need: "ask",
  job: "job",
};

export default function AdminContentPage() {
  const gate = usePlatformAdminGate();
  const [filter, setFilter] = useState<(typeof KIND_FILTER)[number]["id"]>("all");
  const [items, setItems] = useState<AdminContentItem[] | null>(null);
  const [takedown, setTakedown] = useState<AdminContentItem | null>(null);

  useEffect(() => {
    if (gate !== "ready") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(isRealMode() ? [] : getAdminContent());
  }, [gate]);

  const confirmTakedown = async (reason: string) => {
    if (!takedown || isRealMode()) return;
    setItems((prev) => prev?.map((i) => (i.id === takedown.id ? { ...i, status: "removed" as const } : i)) ?? null);
    pushPlatformAudit({
      actorName: "Platform Admin",
      action: "content.takedown",
      target: takedown.title,
      metadata: reason,
    });
  };

  const visible = items?.filter((i) => filter === "all" || i.kind === filter) ?? [];

  return (
    <AdminShell title="Content">
      {isRealMode() ? (
        <StateCard
          kind="empty"
          title="Content browse not connected"
          detail="Activities, needs and jobs takedown need a platform-admin content API."
        />
      ) : !items ? (
        <AdminLoading />
      ) : (
        <>
          <p className="mb-4 text-[14px] text-faint">
            Browse live posts and take down policy-breaking content. Category and activity-type lists will live here once catalog endpoints exist.
          </p>
          <Pills options={KIND_FILTER} value={filter} onChange={setFilter} label="Content type" compact />
          <div className="mt-5">
            {visible.length === 0 ? (
              <StateCard kind="empty" title="Nothing to show" detail="No content matches this filter." />
            ) : (
              <AdminList>
                {visible.map((item) => (
                  <AdminRow key={item.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <KindChip kind={KIND_TO_CHIP[item.kind]} />
                        <p className="mt-1 text-[15px] font-semibold">{item.title}</p>
                        <p className="text-[13px] text-faint">
                          {item.authorName} · {item.area} · {formatDateTime(item.createdAt)}
                        </p>
                        {item.reportCount > 0 && (
                          <p className="mt-1 text-[12px] text-warning">{item.reportCount} report(s)</p>
                        )}
                      </div>
                      <StatusPill status={item.status === "live" ? "active" : "suspended"} />
                    </div>
                    {item.status === "live" && (
                      <div className="mt-3">
                        <DashButton variant="danger" onClick={() => setTakedown(item)}>
                          Take down…
                        </DashButton>
                      </div>
                    )}
                  </AdminRow>
                ))}
              </AdminList>
            )}
          </div>
          <ReasonSheet
            open={!!takedown}
            title="Take down content"
            detail={takedown ? `"${takedown.title}" will be hidden from Arena.` : undefined}
            confirmLabel="Take down"
            onClose={() => setTakedown(null)}
            onConfirm={confirmTakedown}
          />
        </>
      )}
    </AdminShell>
  );
}
