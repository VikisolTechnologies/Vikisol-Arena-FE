"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import { Button } from "@/components/bplus/Button";
import { addIndustry, listAdminIndustries, setIndustryActive, type AdminIndustryRow } from "@/lib/api/platformAdmin";
import { DashButton, StatusPill } from "@/components/dash/Parts";

/**
 * MARATHON-FE-2 Step B item 5. Staff-managed industry catalogue - GET/POST/PUT /admin/industries
 * had no frontend at all. No board - built from the backend contract (IndustryController).
 */
export default function AdminIndustriesPage() {
  const gate = usePlatformAdminGate();
  const [rows, setRows] = useState<AdminIndustryRow[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => listAdminIndustries().then(setRows).catch(() => setError("The industry list didn't load. Refresh to try again."));
  useEffect(() => {
    if (gate === "ready") load();
  }, [gate]);

  const add = async () => {
    const l = label.trim();
    if (!l) return;
    setBusy(true);
    setError("");
    try {
      await addIndustry(l);
      setLabel("");
      load();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: AdminIndustryRow) => {
    setBusyKey(row.key);
    setError("");
    try {
      await setIndustryActive(row.key, !row.active);
      load();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "That didn't save. Try again.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <AdminShell title="Industries">
      {error && <p role="alert" className="mb-4 rounded-xl bg-danger/12 px-3.5 py-2.5 text-[14px]">{error}</p>}
      <p className="mb-4 text-[14px] text-faint">
        The active list feeds every industry picker across Arena (company profile, talent search, job postings). Changes are audited.
      </p>
      <div className="mb-5 flex max-w-md items-center gap-2">
        <label htmlFor="new-industry" className="sr-only">New industry name</label>
        <input
          id="new-industry"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="e.g. Hospitality"
          maxLength={80}
          className="min-h-11 w-full rounded-full border border-field-line bg-transparent px-4 text-[15px] outline-none focus-visible:border-primary"
        />
        <Button loading={busy} disabled={!label.trim()} onClick={add}><Plus className="size-4" aria-hidden /> Add</Button>
      </div>

      {!rows ? (
        <AdminLoading />
      ) : (
        <AdminList>
          {rows.map((row) => (
            <AdminRow key={row.key}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold">{row.label}</p>
                  <StatusPill status={row.active ? "active" : "inactive"} />
                </div>
                <DashButton variant="outline" disabled={busyKey === row.key} onClick={() => toggle(row)}>
                  {row.active ? "Deactivate" : "Activate"}
                </DashButton>
              </div>
            </AdminRow>
          ))}
        </AdminList>
      )}
    </AdminShell>
  );
}
