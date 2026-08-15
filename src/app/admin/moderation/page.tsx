"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, ShieldX, ShieldCheck, Briefcase } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getModerationQueue, resolveModerationItem } from "@/lib/api/platformAdmin";
import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { ModerationItem, ModerationStatus } from "@/lib/types";

const TABS: { key: ModerationStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "dismissed", label: "Dismissed" },
  { key: "taken_down", label: "Taken down" },
];

export default function ModerationPage() {
  const gate = usePlatformAdminGate();
  const [status, setStatus] = useState<ModerationStatus>("pending");
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = (s: ModerationStatus) => { getModerationQueue(s).then(setItems); };

  useEffect(() => { if (gate === "ready") load(status); }, [gate, status]);  

  const resolve = async (id: string, action: "dismiss" | "takedown") => {
    setBusyId(id);
    try {
      await resolveModerationItem(id, action);
      load(status);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PlatformAdminShell title="Moderation queue">
      <div className="mb-5 flex gap-1 rounded-full border border-border bg-secondary p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === t.key ? "bg-primary/15 text-primary-soft" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!items ? (
        <OrbLoader className="h-96" />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-secondary px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {item.contentType === "room" ? <MessagesSquare className="size-3.5 shrink-0 text-primary-soft" /> : <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />}
                    {item.postingTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.contentType === "room"
                      ? `Room report${item.reporterName ? ` · reported by ${item.reporterName}` : ""}`
                      : item.tenantName}
                    {" · "}{formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-amber-500/15 text-[10px] text-amber-400">{item.reason}</Badge>
              </div>
              {item.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost-glass" size="sm" className="gap-1.5" disabled={busyId === item.id} onClick={() => resolve(item.id, "dismiss")}>
                    <ShieldCheck className="size-3.5" /> Dismiss
                  </Button>
                  <Button variant="ghost-glass" size="sm" className="gap-1.5 text-red-400" disabled={busyId === item.id} onClick={() => resolve(item.id, "takedown")}>
                    <ShieldX className="size-3.5" /> Take down
                  </Button>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <EmptyState title="Nothing in this queue right now." className="py-16" />}
        </div>
      )}
    </PlatformAdminShell>
  );
}
