"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PlatformAdminShell, usePlatformAdminGate } from "@/components/app/PlatformAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listFeatureFlags, createFeatureFlag, toggleFeatureFlag } from "@/lib/api/platformAdmin";
import { EmptyState } from "@/components/ui/empty-state";
import type { FeatureFlag } from "@/lib/types";

export default function FeatureFlagsPage() {
  const gate = usePlatformAdminGate();
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => { listFeatureFlags().then(setFlags); };
  useEffect(() => { if (gate === "ready") load(); }, [gate]);  

  const toggle = (flag: FeatureFlag) => {
    setFlags((prev) => prev && prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
    toggleFeatureFlag(flag.id, !flag.enabled).catch(load);
  };

  const submitCreate = async () => {
    if (!form.key.trim() || !form.label.trim()) { setError("Key and label are required."); return; }
    setSaving(true);
    setError("");
    try {
      await createFeatureFlag({ key: form.key.trim(), label: form.label.trim(), description: form.description.trim() || undefined, enabled: false });
      setForm({ key: "", label: "", description: "" });
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create flag");
    } finally {
      setSaving(false);
    }
  };

  if (!flags) {
    return (
      <PlatformAdminShell title="Feature flags">
        <OrbLoader className="h-96" />
      </PlatformAdminShell>
    );
  }

  return (
    <PlatformAdminShell
      title="Feature flags"
      actions={
        <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> New flag
        </Button>
      }
    >
      <div className="space-y-2.5">
        {flags.map((f) => (
          <div key={f.id} className="flex items-center gap-4 rounded-2xl border border-border bg-white/[0.02] px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{f.label}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{f.key}</p>
              {f.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.description}</p>}
            </div>
            <Switch checked={f.enabled} onCheckedChange={() => toggle(f)} />
          </div>
        ))}
        {flags.length === 0 && <EmptyState title="No feature flags yet." className="py-16" />}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="border-border bg-popover">
          <DialogHeader>
            <DialogTitle>New feature flag</DialogTitle>
            <DialogDescription>Starts disabled - flip it on once you&apos;re ready.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Key</label>
              <Input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="e.g. new_pricing_page" className="border-border bg-white/[0.03] font-mono" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Label</label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. New pricing page" className="border-border bg-white/[0.03]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Description (optional)</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="border-border bg-white/[0.03]" />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button variant="primary-gradient" size="sm" className="w-full" onClick={submitCreate} disabled={saving}>
              {saving ? "Creating…" : "Create flag"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PlatformAdminShell>
  );
}
