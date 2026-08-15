"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { searchAudit, auditExportUrl, type AuditEvent } from "@/lib/api/companyAdmin";
import { isRealMode } from "@/lib/api/mode";
import { getToken } from "@/lib/api/httpClient";
import { formatDateTime } from "@/lib/format";

const ACTIONS = [
  "", "posting.created", "posting.closed", "candidate.unlocked", "credit.spent", "stage.moved",
  "interview.scheduled", "feedback.submitted", "message.sent", "member.invited", "member.removed",
  "member.role_changed", "plan.changed",
];

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [action, setAction] = useState("");
  const [sinceDays, setSinceDays] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    searchAudit({ action: action || undefined, sinceDays, page, size: 20 }).then((res) => {
      setEvents(res.content);
      setTotalPages(res.totalPages);
    });
  }, [action, sinceDays, page]);

  const exportCsv = async () => {
    if (!isRealMode()) {
      const rows = events ?? [];
      const csv = "Time,Actor,Action,Target\n" + rows.map((e) => `"${e.createdAt}","${e.actorName}","${e.action}","${e.target ?? ""}"`).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "audit-log.csv"; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const res = await fetch(auditExportUrl(), { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <CompanyAdminShell
      title="Audit log"
      actions={
        <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={exportCsv}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(0); }}
          className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs"
        >
          <option value="">All actions</option>
          {ACTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setSinceDays(sinceDays === d ? undefined : d); setPage(0); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              sinceDays === d ? "bg-primary/15 text-primary-soft" : "border border-border bg-secondary text-muted-foreground"
            }`}
          >
            Last {d}d
          </button>
        ))}
      </div>

      {!events ? (
        <OrbLoader className="h-96" />
      ) : (
        <>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm">
                <span className="w-40 shrink-0 text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                <span className="font-medium">{e.actorName}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">{e.action}</span>
                {e.target && <span className="text-muted-foreground">{e.target}</span>}
              </div>
            ))}
            {events.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-muted-foreground">
                No matching audit events.
              </p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="ghost-glass" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="flex items-center px-2 text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
              <Button variant="ghost-glass" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </CompanyAdminShell>
  );
}
