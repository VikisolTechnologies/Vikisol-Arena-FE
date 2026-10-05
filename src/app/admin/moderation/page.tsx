"use client";

import { useEffect, useMemo, useState } from "react";
import { MessagesSquare, Briefcase, ShieldCheck, ShieldX, AlertTriangle, Ban, UserX } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow, ReasonSheet, SlaTimer } from "@/components/admin/parts";
import { pushPlatformAudit } from "@/components/admin/fixtures";
import { Pills, StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { banReportedUser, getModerationQueue, resolveModerationItem, suspendReportedUser, warnReportedUser } from "@/lib/api/platformAdmin";
import { isRealMode } from "@/lib/api/mode";
import { formatDateTime } from "@/lib/format";
import type { ModerationItem, ModerationStatus } from "@/lib/types";

const SUSPEND_DAYS = 7;

const TABS: { key: ModerationStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "dismissed", label: "Dismissed" },
  { key: "taken_down", label: "Removed" },
];

type ModerationAction = "dismiss" | "takedown" | "warn" | "suspend" | "ban";

function slaDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString();
}

export default function ModerationPage() {
  const gate = usePlatformAdminGate();
  const [status, setStatus] = useState<ModerationStatus>("pending");
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ item: ModerationItem; action: ModerationAction } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = (s: ModerationStatus) => {
    getModerationQueue(s).then(setItems);
  };

  useEffect(() => {
    if (gate === "ready") load(status);
  }, [gate, status]);

  const resolveApi = async (id: string, action: "dismiss" | "takedown") => {
    setBusyId(id);
    try {
      await resolveModerationItem(id, action);
      load(status);
    } finally {
      setBusyId(null);
    }
  };

  const resolveAccountAction = async (reason: string) => {
    if (!pendingAction) return;
    const { item, action } = pendingAction;
    if (action === "warn") await warnReportedUser(item.id, reason);
    else if (action === "suspend") await suspendReportedUser(item.id, reason, SUSPEND_DAYS);
    else if (action === "ban") await banReportedUser(item.id, reason);
    if (isRealMode()) {
      // warn/suspend/ban don't resolve the moderation item itself (it can still be dismissed or
      // taken down separately) - just show the note was sent until the next reload.
      setNotes((n) => ({ ...n, [item.id]: reason }));
    } else {
      setNotes((n) => ({ ...n, [item.id]: reason }));
      pushPlatformAudit({
        actorName: "Platform Admin",
        action: action === "warn" ? "moderation.warned" : action === "suspend" ? "moderation.suspended" : "moderation.banned",
        target: item.postingTitle,
        metadata: reason,
      });
    }
  };

  const onAction = (item: ModerationItem, action: ModerationAction) => {
    if (action === "dismiss") {
      void resolveApi(item.id, "dismiss");
      return;
    }
    if (action === "takedown") {
      void resolveApi(item.id, "takedown");
      return;
    }
    setPendingAction({ item, action });
  };

  const empty = useMemo(() => items?.length === 0, [items]);

  return (
    <AdminShell title="Moderation">
      <p className="mb-4 text-[14px] text-faint">
        Reports queue with context. Pending items show a 24-hour review timer.
      </p>
      <Pills
        options={TABS.map((t) => ({ id: t.key, label: t.label }))}
        value={status}
        onChange={setStatus}
        label="Moderation status"
        compact
      />

      {!items ? (
        <AdminLoading className="mt-5" />
      ) : empty ? (
        <div className="mt-5">
          <StateCard kind="empty" title="Nothing in this queue right now." />
        </div>
      ) : (
        <AdminList>
          {items.map((item) => (
            <AdminRow key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                    {item.contentType === "room" ? (
                      <MessagesSquare className="size-4 shrink-0 text-info-on-dark" aria-hidden />
                    ) : (
                      <Briefcase className="size-4 shrink-0 text-faint" aria-hidden />
                    )}
                    {item.postingTitle}
                  </p>
                  <p className="mt-1 text-[13px] text-faint">
                    {item.contentType === "room"
                      ? `Room report${item.reporterName ? ` · reported by ${item.reporterName}` : ""}`
                      : `Job · ${item.tenantName ?? "Unknown company"}`}
                    {" · "}
                    {formatDateTime(item.createdAt)}
                  </p>
                  <p className="mt-2 inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-[12px] font-semibold text-warning">
                    {item.reason}
                  </p>
                  {notes[item.id] && (
                    <p className="mt-2 text-[13px] text-faint">Note: {notes[item.id]}</p>
                  )}
                </div>
                {item.status === "pending" && <SlaTimer deadlineAt={slaDeadline(item.createdAt)} label="24h left" />}
              </div>
              {item.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <DashButton variant="outline" disabled={busyId === item.id} onClick={() => onAction(item, "dismiss")}>
                    <ShieldCheck className="size-4" aria-hidden /> Dismiss
                  </DashButton>
                  <DashButton variant="outline" disabled={busyId === item.id} onClick={() => onAction(item, "warn")}>
                    <AlertTriangle className="size-4" aria-hidden /> Warn…
                  </DashButton>
                  <DashButton variant="danger" disabled={busyId === item.id} onClick={() => onAction(item, "takedown")}>
                    <ShieldX className="size-4" aria-hidden /> Remove content
                  </DashButton>
                  <DashButton variant="danger" disabled={busyId === item.id} onClick={() => onAction(item, "suspend")}>
                    <UserX className="size-4" aria-hidden /> Suspend…
                  </DashButton>
                  <DashButton variant="danger" disabled={busyId === item.id} onClick={() => onAction(item, "ban")}>
                    <Ban className="size-4" aria-hidden /> Ban…
                  </DashButton>
                </div>
              )}
            </AdminRow>
          ))}
        </AdminList>
      )}

      <ReasonSheet
        open={!!pendingAction && pendingAction.action !== "dismiss" && pendingAction.action !== "takedown"}
        title={
          pendingAction?.action === "warn"
            ? "Send a warning"
            : pendingAction?.action === "suspend"
              ? "Suspend account"
              : "Ban account"
        }
        detail={pendingAction ? `"${pendingAction.item.postingTitle}" — reason is required and logged.${pendingAction.action === "suspend" ? ` Suspends for ${SUSPEND_DAYS} days.` : ""}` : undefined}
        confirmLabel={
          pendingAction?.action === "warn" ? "Send warning" : pendingAction?.action === "suspend" ? "Suspend" : "Ban"
        }
        onClose={() => setPendingAction(null)}
        onConfirm={resolveAccountAction}
      />
    </AdminShell>
  );
}
