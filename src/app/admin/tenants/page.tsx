"use client";

import { useEffect, useState } from "react";
import { Search, Pause, Play, Settings2 } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listTenants, setTenantSuspended, adjustSubscription, type AdjustSubscriptionInput } from "@/lib/api/platformAdmin";
import type { TenantSummary } from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  suspended: "bg-red-500/15 text-red-400",
};

const PLANS: TenantSummary["plan"][] = ["free", "pro", "enterprise"];

export default function TenantsPage() {
  const gate = usePlatformAdminGate();
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TenantSummary | null>(null);
  const [form, setForm] = useState<{ plan: TenantSummary["plan"]; seatsTotal: string; creditDelta: string; reason: string }>({
    plan: "free", seatsTotal: "", creditDelta: "", reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = (q?: string) => listTenants(q).then(setTenants);

  useEffect(() => { if (gate === "ready") load(); }, [gate]);  

  const openEdit = (t: TenantSummary) => {
    setEditing(t);
    setForm({ plan: t.plan, seatsTotal: String(t.seatsTotal), creditDelta: "", reason: "" });
    setError("");
  };

  const submitAdjust = async () => {
    if (!editing || !form.reason.trim()) { setError("A reason is required."); return; }
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

  if (!tenants) {
    return (
      <PlatformAdminShell title="Tenants">
        <OrbLoader className="h-96" />
      </PlatformAdminShell>
    );
  }

  return (
    <PlatformAdminShell title="Tenants">
      <div className="mb-5 flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-4 py-2.5">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); load(e.target.value); }}
          placeholder="Search tenants by company name…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        {tenants.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
            <span className="text-xl">{t.logoEmoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{t.ownerEmail}</p>
            </div>
            <Badge variant="secondary" className="bg-white/5 text-[10px] capitalize text-muted-foreground">{t.plan}</Badge>
            <span className="text-xs text-muted-foreground">{t.seatsUsed}/{t.seatsTotal} seats</span>
            <span className="text-xs text-muted-foreground">{t.unlockCreditsUsed}/{t.unlockCreditsTotal} credits</span>
            <Badge variant="secondary" className={STATUS_TONE[t.status]}>{t.status}</Badge>
            <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => openEdit(t)}>
              <Settings2 className="size-3.5" /> Subscription
            </Button>
            {t.status === "suspended" ? (
              <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => setTenantSuspended(t.id, false).then(() => load(query))}>
                <Play className="size-3.5" /> Reactivate
              </Button>
            ) : (
              <Button variant="ghost-glass" size="sm" className="gap-1.5" onClick={() => setTenantSuspended(t.id, true).then(() => load(query))}>
                <Pause className="size-3.5" /> Suspend
              </Button>
            )}
          </div>
        ))}
        {tenants.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center text-sm text-muted-foreground">
            No tenants match that search.
          </p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>Adjust {editing?.companyName}&apos;s subscription</DialogTitle>
            <DialogDescription>Every change here is written to the audit log, tenant-visible.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              {PLANS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, plan: p }))}
                  className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    form.plan === p ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-white/[0.03] text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Seat total</label>
              <Input type="number" min={1} value={form.seatsTotal} onChange={(e) => setForm((f) => ({ ...f, seatsTotal: e.target.value }))} className="border-border bg-white/[0.03]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Credit adjustment (+/-)</label>
              <Input type="number" value={form.creditDelta} onChange={(e) => setForm((f) => ({ ...f, creditDelta: e.target.value }))} placeholder="e.g. 50 or -10" className="border-border bg-white/[0.03]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Reason (required)</label>
              <Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Support goodwill credit" className="border-border bg-white/[0.03]" />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button variant="primary-gradient" size="sm" className="w-full" onClick={submitAdjust} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlatformAdminShell>
  );
}
