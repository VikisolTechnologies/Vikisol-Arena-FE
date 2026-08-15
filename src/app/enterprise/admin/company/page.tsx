"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { CompanyAdminShell } from "@/components/app/CompanyAdminShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMyEnterpriseProfile, saveMyEnterpriseProfile } from "@/lib/api/enterprise";
import { INDUSTRIES } from "@/lib/mock/seed";
import type { CompanySize, EnterpriseProfile, Industry } from "@/lib/types";

const LOGO_OPTIONS = ["🏢", "🚀", "💡", "🩺", "🏭", "🛍️"];
const SIZE_OPTIONS: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);
  const [draftRole, setDraftRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyEnterpriseProfile().then(setProfile);
  }, []);

  const update = <K extends keyof EnterpriseProfile>(key: K, value: EnterpriseProfile[K]) => {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  };

  const addRole = () => {
    if (!profile || !draftRole.trim() || profile.hiringFor.includes(draftRole.trim())) return;
    update("hiringFor", [...profile.hiringFor, draftRole.trim()]);
    setDraftRole("");
  };

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await saveMyEnterpriseProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <CompanyAdminShell title="Company profile">
        <OrbLoader className="h-96" />
      </CompanyAdminShell>
    );
  }

  return (
    <CompanyAdminShell
      title="Company profile"
      actions={
        <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={save} disabled={saving}>
          {saved ? <Check className="size-3.5" /> : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
      }
    >
      <div className="max-w-lg space-y-4">
        <div>
          <Label htmlFor="companyName">Company name</Label>
          <Input id="companyName" value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} className="mt-1.5 border-border bg-secondary" />
        </div>

        <div>
          <Label>Logo</Label>
          <div className="mt-1.5 flex gap-2">
            {LOGO_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => update("logoEmoji", emoji)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl border text-lg transition-colors",
                  profile.logoEmoji === emoji ? "border-primary/60 bg-primary/10" : "border-border bg-secondary",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Industry</Label>
            <select
              value={profile.industry}
              onChange={(e) => update("industry", e.target.value as Industry)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm outline-none"
            >
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>
          <div>
            <Label>Company size</Label>
            <select
              value={profile.size}
              onChange={(e) => update("size", e.target.value as CompanySize)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-border bg-secondary px-3 text-sm outline-none"
            >
              {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} employees</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label>What are you hiring for?</Label>
          {profile.hiringFor.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {profile.hiringFor.map((role) => (
                <Badge key={role} variant="glass" className="gap-1 border-primary/40 text-primary-soft">
                  {role}
                  <button type="button" onClick={() => update("hiringFor", profile.hiringFor.filter((r) => r !== role))}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex gap-2">
            <Input
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }}
              placeholder="e.g. Senior React Developer"
              className="border-border bg-secondary"
            />
            <Button type="button" variant="ghost-glass" size="sm" onClick={addRole}>Add</Button>
          </div>
        </div>
      </div>
    </CompanyAdminShell>
  );
}
