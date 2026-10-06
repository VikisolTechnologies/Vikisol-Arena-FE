"use client";

import { useEffect, useState } from "react";
import { m } from "motion/react";
import { Download } from "lucide-react";
import { rise } from "@/lib/motion";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { auditExportUrl, searchAudit, type AuditEvent } from "@/lib/api/companyAdmin";
import { getToken } from "@/lib/api/httpClient";

/** Plain-language names for the audit actions (the codes stay what the API filters on). */
const ACTIONS: Record<string, string> = {
  "posting.created": "Posted a job",
  "posting.closed": "Closed a job",
  "candidate.unlocked": "Unlocked a profile",
  "credit.spent": "Spent a credit",
  "stage.moved": "Moved a candidate",
  "interview.scheduled": "Scheduled an interview",
  "feedback.submitted": "Sent interview feedback",
  "message.sent": "Sent a message",
  "member.invited": "Invited a teammate",
  "member.removed": "Removed a teammate",
  "member.role_changed": "Changed a role",
  "plan.changed": "Changed the plan",
};
const SINCE = [
  { id: "all", label: "All time" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;
type Since = (typeof SINCE)[number]["id"];

const at = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

function download(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audit-log.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/** Company settings — Audit log (flow §8; no board — designed in B+). Same searchAudit + export. */
export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [action, setAction] = useState("");
  const [since, setSince] = useState<Since>("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let live = true;
    searchAudit({ action: action || undefined, sinceDays: since === "all" ? undefined : Number(since), page, size: 20 })
      .then((res) => {
        if (!live) return;
        setError("");
        setEvents(res.content);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        if (!live) return;
        setEvents([]);
        setError("The audit log didn't load. Try again.");
      });
    return () => {
      live = false;
    };
  }, [action, since, page]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(auditExportUrl(), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error("export failed");
      download(await res.blob());
    } catch {
      setError("The export didn't download. Try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <CompanyAdminShell title="Audit log" actions={<DashButton variant="outline" onClick={exportCsv} disabled={exporting}><Download className="size-4" aria-hidden /> {exporting ? "Exporting…" : "Export CSV"}</DashButton>}>
      <p className="mb-4 max-w-[62ch] text-[15px] text-faint">Every action your team takes — who, what and when. Kept for your records; it can&apos;t be edited.</p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label>
          <span className="sr-only">Action</span>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} className="min-h-11 rounded-full border border-field-line bg-transparent px-4 text-[14px] [&>option]:text-paper-ink">
            <option value="">All actions</option>
            {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <Pills label="Time range" options={SINCE} value={since} onChange={(s) => { setSince(s); setPage(0); }} compact />
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      {!events ? (
        <Skeleton className="h-72" />
      ) : events.length === 0 ? (
        !error && <StateCard kind="empty" title="Nothing matches" detail="Try another action or time range." />
      ) : (
        <>
          <m.ol initial="hidden" animate="shown" className="divide-y divide-line rounded-tile border border-line bg-surface">
            {events.map((e, i) => (
              <m.li key={e.id} variants={rise} custom={i} className="grid gap-1 px-4 py-3 sm:grid-cols-[190px_1fr]">
                <span className="text-[13px] text-faint">{at(e.createdAt)}</span>
                <span className="text-[15px]"><strong className="font-semibold">{e.actorName}</strong> · {ACTIONS[e.action] ?? e.action}{e.target && <span className="text-faint"> — {e.target}</span>}</span>
              </m.li>
            ))}
          </m.ol>
          {totalPages > 1 && (
            <nav aria-label="Audit pages" className="mt-4 flex items-center justify-center gap-3">
              <DashButton variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</DashButton>
              <span className="text-[14px] text-faint">Page {page + 1} of {totalPages}</span>
              <DashButton variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</DashButton>
            </nav>
          )}
        </>
      )}
    </CompanyAdminShell>
  );
}
