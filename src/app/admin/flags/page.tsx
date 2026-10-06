"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AdminShell, usePlatformAdminGate } from "@/components/admin/AdminShell";
import { AdminList, AdminLoading, AdminRow } from "@/components/admin/parts";
import { BottomSheet } from "@/components/bplus/BottomSheet";
import { TextField } from "@/components/bplus/TextField";
import { Toggle } from "@/components/bplus/Controls";
import { StateCard } from "@/components/bplus/Primitives";
import { DashButton } from "@/components/dash/Parts";
import { listFeatureFlags, createFeatureFlag, toggleFeatureFlag } from "@/lib/api/platformAdmin";
import type { FeatureFlag } from "@/lib/types";

export default function FeatureFlagsPage() {
  const gate = usePlatformAdminGate();
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    listFeatureFlags().then(setFlags);
  };

  useEffect(() => {
    if (gate === "ready") load();
  }, [gate]);

  const toggle = (flag: FeatureFlag) => {
    setFlags((prev) => prev && prev.map((f) => (f.id === flag.id ? { ...f, enabled: !f.enabled } : f)));
    toggleFeatureFlag(flag.id, !flag.enabled).catch(load);
  };

  const submitCreate = async () => {
    if (!form.key.trim() || !form.label.trim()) {
      setError("Key and label are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createFeatureFlag({
        key: form.key.trim(),
        label: form.label.trim(),
        description: form.description.trim() || undefined,
        enabled: false,
      });
      setForm({ key: "", label: "", description: "" });
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create flag");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Feature flags"
      actions={
        <DashButton variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden /> New flag
        </DashButton>
      }
    >
      {!flags ? (
        <AdminLoading />
      ) : flags.length === 0 ? (
        <StateCard kind="empty" title="No feature flags yet." />
      ) : (
        <AdminList>
          {flags.map((f) => (
            <AdminRow key={f.id}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{f.label}</p>
                  <p className="truncate font-mono text-[12px] text-faint">{f.key}</p>
                  {f.description && <p className="mt-0.5 truncate text-[13px] text-faint">{f.description}</p>}
                </div>
                <Toggle label={f.enabled ? "Enabled" : "Disabled"} checked={f.enabled} onChange={() => toggle(f)} />
              </div>
            </AdminRow>
          ))}
        </AdminList>
      )}

      <BottomSheet open={creating} onClose={() => setCreating(false)} title="New feature flag">
        <p className="mb-4 text-[14px] text-paper-ink-muted">Starts disabled — flip it on when you&apos;re ready.</p>
        <div className="space-y-3">
          <TextField label="Key" labelStyle="stacked" value={form.key} onChange={(v) => setForm((f) => ({ ...f, key: v }))} placeholder="e.g. new_pricing_page" />
          <TextField label="Label" labelStyle="stacked" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder="e.g. New pricing page" />
          <TextField label="Description (optional)" labelStyle="stacked" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          {error && <p className="text-[13px] text-danger-on-paper">{error}</p>}
          <DashButton variant="primary" onClick={submitCreate} disabled={saving} onPaper>
            {saving ? "Creating…" : "Create flag"}
          </DashButton>
        </div>
      </BottomSheet>
    </AdminShell>
  );
}
