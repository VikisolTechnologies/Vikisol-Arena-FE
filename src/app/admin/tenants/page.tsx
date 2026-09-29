"use client";

import { useEffect, useState } from "react";
import { Search, Pause, Play, Settings2 } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { TextField } from "@/components/bplus/TextField";
import { StateCard } from "@/components/bplus/Primitives";
import { DashButton, StatusPill } from "@/components/dash/Parts";
import { CompanyMark } from "@/components/career/CompanyMark";
import {
  listTenants,
  setTenantSuspended,
  adjustSubscription,
  type AdjustSubscriptionInput,
} from "@/lib/api/platformAdmin";
import type { TenantSummary } from "@/lib/types";

const PLANS: TenantSummary["plan"][] = ["free", "pro", "enterprise"];

export default function TenantsPage() {
  const gate = usePlatformAdminGate();
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TenantSummary | null>(null);
  const [form, setForm] = useState({
    plan: "free" as TenantSummary["plan"],
    seatsTotal: "",
    creditDelta: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = (q?: string) => listTenants(q).then(setTenants);

  useEffect(() => {
    if (gate === "ready") load();
  }, [gate]);

  const openEdit = (t: TenantSummary) => {
    setEditing(t);
    setForm({ plan: t.plan, seatsTotal: String(t.seatsTotal), creditDelta: "", reason: "" });
    setError("");
  };

  const submitAdjust = async () => {
    if (!editing || !form.reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input: AdjustSubscriptionInput = { reason: form.reason.trim() };
      if (form.plan !== editing.plan) input.plan = form.plan;
      const seats = Number(form.seatsTotal);
      if (seats && seats !== editing.seatsTotal) input.seatsTotal = seats;
      const delta = Number(form.creditDelta);
      if (delta) input.creditDelta = delta;
      await adjustSubscription(editing.id, input);
      setEditing(null);
      load(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't adjust subscription");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Companies">
      <div className="mb-4 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4">
        <Search className="size-4 text-faint" aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            load(e.target.value);
          }}
          placeholder="Search companies…"
          aria-label="Search companies"
          className="w-full bg-transparent py-2.5 text-[15px] outline-none placeholder:text-faint"
        />
      </div>

      {!tenants ? (
        <AdminLoading />
      ) : tenants.length === 0 ? (
        <StateCard kind="empty" title="No companies match that search." />
      ) : (
        <AdminList>
          {tenants.map((t) => (
            <AdminRow key={t.id}>
              <div className="flex flex-wrap items-center gap-3">
                <CompanyMark name={t.companyName} className="size-11 text-[16px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{t.companyName}</p>
                  <p className="truncate text-[13px] text-faint">{t.ownerEmail}</p>
                </div>
                <StatusPill status={t.status} />
                <span className="text-[12px] capitalize text-faint">{t.plan}</span>
                <span className="text-[12px] text-faint">
                  {t.seatsUsed}/{t.seatsTotal} seats
                </span>
                <span className="text-[12px] text-faint">
                  {t.unlockCreditsUsed}/{t.unlockCreditsTotal} credits
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <DashButton variant="outline" onClick={() => openEdit(t)}>
                  <Settings2 className="size-4" aria-hidden /> Plan & seats
                </DashButton>
                {t.status === "suspended" ? (
                  <DashButton variant="primary" onClick={() => setTenantSuspended(t.id, false).then(() => load(query))}>
                    <Play className="size-4" aria-hidden /> Reactivate
                  </DashButton>
                ) : (
                  <DashButton variant="danger" onClick={() => setTenantSuspended(t.id, true).then(() => load(query))}>
                    <Pause className="size-4" aria-hidden /> Suspend
                  </DashButton>
                )}
              </div>
            </AdminRow>
          ))}
        </AdminList>
      )}

      <BottomSheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `${editing.companyName} — subscription` : "Subscription"}>
        <p className="mb-4 text-[14px] text-paper-ink-muted">Every change is written to the audit log.</p>
        <div className="flex gap-2">
          {PLANS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setForm((f) => ({ ...f, plan: p }))}
              className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold capitalize ${
                form.plan === p ? "border-primary bg-primary/15 text-primary-on-paper" : "border-paper-ink/20 text-paper-ink-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <TextField label="Seat total" labelStyle="stacked" type="number" value={form.seatsTotal} onChange={(v) => setForm((f) => ({ ...f, seatsTotal: v }))} />
          <TextField label="Credit adjustment (+/−)" labelStyle="stacked" value={form.creditDelta} onChange={(v) => setForm((f) => ({ ...f, creditDelta: v }))} placeholder="e.g. 50 or -10" />
          <TextField label="Reason (required)" labelStyle="stacked" value={form.reason} onChange={(v) => setForm((f) => ({ ...f, reason: v }))} error={error} />
          <DashButton variant="primary" onClick={submitAdjust} disabled={saving} onPaper>
            {saving ? "Saving…" : "Save changes"}
          </DashButton>
        </div>
      </BottomSheet>
    </AdminShell>
  );
}
