"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, X } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { saveMyEnterpriseProfile } from "@/lib/api/enterprise";
import { setEnterpriseOnboarded, getSession } from "@/lib/session";
import { INDUSTRIES } from "@/lib/mock/seed";
import type { CompanySize, Industry } from "@/lib/types";

const LOGO_OPTIONS = ["🏢", "🚀", "💡", "🩺", "🏭", "🛍️"];
const SIZE_OPTIONS: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function EnterpriseOnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [logoEmoji, setLogoEmoji] = useState(LOGO_OPTIONS[0]);
  const [industry, setIndustry] = useState<Industry>(INDUSTRIES[0]);
  const [size, setSize] = useState<CompanySize>("11-50");
  const [hiringFor, setHiringFor] = useState<string[]>([]);
  const [draftRole, setDraftRole] = useState("");
  const [saving, setSaving] = useState(false);

  const addRole = () => {
    if (draftRole.trim() && !hiringFor.includes(draftRole.trim())) {
      setHiringFor((prev) => [...prev, draftRole.trim()]);
      setDraftRole("");
    }
  };

  const canContinue = companyName.trim().length > 0 && hiringFor.length > 0;

  const finish = async () => {
    if (!getSession()) { router.replace("/auth"); return; }
    setSaving(true);
    await saveMyEnterpriseProfile({
      companyName,
      logoEmoji,
      industry,
      size,
      hiringFor,
      plan: "free",
      seatsUsed: 1,
      seatsTotal: 3,
      unlockCreditsUsed: 0,
      unlockCreditsTotal: 25,
    });
    setEnterpriseOnboarded();
    router.push("/enterprise/dashboard");
  };

  return (
    <div className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-5 py-16 text-foreground">
      <AuraBackground />
      <div className="relative z-10 w-full max-w-lg rounded-[24px] border border-border bg-white/[0.03] p-7 backdrop-blur-xl">
        <div className="mb-5 flex items-center gap-2">
          <Building2 className="size-5 text-primary-soft" />
          <h1 className="font-display text-xl font-bold tracking-tight">Set up your company</h1>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1.5 border-border bg-white/[0.03]" />
          </div>

          <div>
            <Label>Logo</Label>
            <div className="mt-1.5 flex gap-2">
              {LOGO_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setLogoEmoji(emoji)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl border text-lg transition-colors",
                    logoEmoji === emoji ? "border-primary/60 bg-primary/10" : "border-border bg-white/[0.02]",
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
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-border bg-white/[0.03] px-3 text-sm outline-none"
              >
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <Label>Company size</Label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as CompanySize)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-border bg-white/[0.03] px-3 text-sm outline-none"
              >
                {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>What are you hiring for?</Label>
            {hiringFor.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {hiringFor.map((role) => (
                  <Badge key={role} variant="glass" className="gap-1 border-primary/40 text-primary-soft">
                    {role}
                    <button type="button" onClick={() => setHiringFor((prev) => prev.filter((r) => r !== role))}>
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
                className="border-border bg-white/[0.03]"
              />
              <Button type="button" variant="ghost-glass" size="sm" onClick={addRole}>Add</Button>
            </div>
          </div>

          <Button variant="primary-gradient" size="cta" className="w-full" disabled={!canContinue || saving} onClick={finish}>
            {saving ? "Setting up…" : "Enter Talent Universe"}
          </Button>
        </div>
      </div>
    </div>
  );
}
