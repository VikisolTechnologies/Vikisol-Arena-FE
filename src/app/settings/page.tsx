"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, ShieldCheck, Sparkles, Eye, Waves, Bell, CalendarClock, DollarSign, Cog, Lock } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Switch } from "@/components/ui/switch";
import { getMyProfile, updateMyConsent, updateMyAutonomy } from "@/lib/api/profile";
import { getNotifications } from "@/lib/api/notifications";
import { getManualReducedEffects, setManualReducedEffects } from "@/hooks/use-reduced-motion";
import { getSession, isOnboarded } from "@/lib/session";
import { getTalentPlan } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { CandidateProfile, AutonomyLevel, AppNotification, NotificationType } from "@/lib/types";

const AUTONOMY_OPTIONS: { key: AutonomyLevel; label: string; desc: string }[] = [
  { key: "manual", label: "Manual", desc: "Your agent only researches — you approve everything, every time." },
  { key: "supervised", label: "Supervised", desc: "Your agent acts on strong matches, but always asks first (default)." },
  { key: "autopilot", label: "Autopilot", desc: "Your agent applies and bids on your behalf automatically, above your thresholds." },
];

const NOTIF_ICONS: Record<NotificationType, typeof Bell> = {
  agent: Sparkles,
  interview: CalendarClock,
  bid: DollarSign,
  system: Cog,
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reducedEffects, setReducedEffects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPro] = useState(() => getTalentPlan() === "pro");

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then((p) => {
      setProfile(p);
      setReducedEffects(getManualReducedEffects());
    });
    getNotifications().then(setNotifications);
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Settings">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  const setAutonomy = async (level: AutonomyLevel) => {
    setSaving(true);
    setProfile(await updateMyAutonomy(level));
    setSaving(false);
  };

  const toggleConsent = async (key: "autoApply" | "searchableByEnterprises") => {
    setSaving(true);
    const next = { ...profile.consent, [key]: !profile.consent[key] };
    setProfile(await updateMyConsent(next));
    setSaving(false);
  };

  const toggleReducedEffects = (value: boolean) => {
    setReducedEffects(value);
    setManualReducedEffects(value);
  };

  return (
    <CandidateAppShell title="Settings" profile={profile}>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
            <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold"><Bot className="size-4 text-primary-soft" /> Autonomy</p>
            <p className="mb-4 text-xs text-muted-foreground">How much should your agent do without asking?</p>
            <div className="space-y-2.5">
              {AUTONOMY_OPTIONS.map(({ key, label, desc }) => {
                const locked = key === "autopilot" && !isPro;
                if (locked) {
                  return (
                    <div key={key} className="flex w-full items-start gap-3 rounded-2xl border border-border bg-white/[0.01] px-4 py-3.5 opacity-60">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-border" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {label} <Lock className="size-3 text-muted-foreground" />
                        </span>
                        <span className="block text-xs text-muted-foreground">{desc}</span>
                        <Link href="/pricing" className="mt-1 inline-block text-xs font-medium text-primary-soft hover:underline">
                          Requires Pro — upgrade
                        </Link>
                      </span>
                    </div>
                  );
                }
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={saving}
                    onClick={() => setAutonomy(key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                      profile.autonomy === key ? "border-primary/60 bg-primary/10" : "border-border bg-white/[0.02] hover:border-white/20",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", profile.autonomy === key ? "border-primary-soft bg-primary-soft" : "border-border")} />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><ShieldCheck className="size-4 text-primary-soft" /> Consent</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="size-3.5 text-primary-soft" /> Auto-apply</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Let your agent apply to strong matches for you</span>
                </span>
                <Switch checked={profile.consent.autoApply} onCheckedChange={() => toggleConsent("autoApply")} disabled={saving} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Eye className="size-3.5 text-primary-soft" /> Visible to enterprises</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Show up in Talent Universe search results</span>
                </span>
                <Switch checked={profile.consent.searchableByEnterprises} onCheckedChange={() => toggleConsent("searchableByEnterprises")} disabled={saving} />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><Waves className="size-4 text-primary-soft" /> Accessibility</p>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-white/[0.02] px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Reduce motion effects</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Turns off the orb animation, particle nebula, and scroll reveals app-wide</span>
              </span>
              <Switch checked={reducedEffects} onCheckedChange={toggleReducedEffects} />
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-white/[0.03] p-6">
          <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><Bell className="size-4 text-primary-soft" /> Notifications</p>
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const Icon = NOTIF_ICONS[n.type];
              return (
                <div key={n.id} className={cn("flex items-start gap-3 rounded-xl border border-border px-3.5 py-3", !n.read && "bg-primary/[0.04]")}>
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-primary-soft"><Icon className="size-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CandidateAppShell>
  );
}
