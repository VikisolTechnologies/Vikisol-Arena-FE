"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bot, ShieldCheck, Sparkles, Eye, Waves, Bell, CalendarClock, DollarSign, Cog, Lock, Download, Trash2, MapPin, Phone, Cake } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMyProfile, updateMyConsent, updateMyAutonomy, updateMyLocation, exportMyData, deleteMyAccount } from "@/lib/api/profile";
import { getVerificationStatus, requestPhoneOtp, confirmPhoneOtp, setDateOfBirth } from "@/lib/api/verification";
import { signOut } from "@/lib/api/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/notifications";
import { getManualReducedEffects, setManualReducedEffects } from "@/hooks/use-reduced-motion";
import { requireOnboarded } from "@/lib/auth-guard";
import { Card } from "@/components/ui/card";
import { getTalentPlan } from "@/lib/plan";
import { cn } from "@/lib/utils";
import type { CandidateProfile, AutonomyLevel, AppNotification, NotificationType, LocationConsent, VerificationStatus } from "@/lib/types";

const LOCATION_OPTIONS: { key: LocationConsent; label: string; desc: string }[] = [
  { key: "precise", label: "Precise", desc: "Your device's location, coarsened and jittered before it's ever stored or shown to anyone" },
  { key: "city", label: "City-level", desc: "Just the city you type in, nothing device-based" },
  { key: "off", label: "Off", desc: "No location at all - Feed and Map both still work, just without distance-based sorting" },
];

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
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [dobSaving, setDobSaving] = useState(false);
  const [dobSaved, setDobSaved] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then((p) => {
      setProfile(p);
      setReducedEffects(getManualReducedEffects());
    });
    getNotifications().then(setNotifications);
    getVerificationStatus().then((v) => {
      setVerification(v);
      setPhoneInput(v.phoneNumber ?? "");
    });
  }, [router]);

  if (!profile) {
    return (
      <AppShell title="Settings">
        <OrbLoader className="h-96" />
      </AppShell>
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

  // §5's location consent - "precise" fires its own explicit browser Geolocation prompt right
  // here (independent of the composer's own per-post version), "city" just geocodes the typed
  // name server-side, "off" clears everything. The app stays fully usable at "off" - Feed/Map
  // just lose distance-based sorting, never a broken or blocked state.
  const setLocation = async (consent: LocationConsent) => {
    setLocationError(null);
    if (consent === "off") {
      setLocationSaving(true);
      setProfile(await updateMyLocation({ consent: "off" }));
      setLocationSaving(false);
      return;
    }
    if (consent === "city") {
      if (!cityInput.trim()) { setLocationError("Enter a city first."); return; }
      setLocationSaving(true);
      setProfile(await updateMyLocation({ consent: "city", city: cityInput.trim() }));
      setLocationSaving(false);
      return;
    }
    if (!navigator.geolocation) { setLocationError("Location isn't available in this browser."); return; }
    setLocationSaving(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setProfile(await updateMyLocation({ consent: "precise", lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocationSaving(false);
      },
      () => {
        setLocationError("Couldn't get your location - check permissions and try again.");
        setLocationSaving(false);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const saveDob = async () => {
    if (!dobInput) return;
    setDobSaving(true);
    try {
      await setDateOfBirth(dobInput);
      setDobSaved(true);
    } finally {
      setDobSaving(false);
    }
  };

  const requestOtp = async () => {
    if (!phoneInput.trim()) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      await requestPhoneOtp(phoneInput.trim());
      setVerification((v) => (v ? { ...v, otpPending: true, phoneNumber: phoneInput.trim() } : v));
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Couldn't send a code.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmOtp = async () => {
    if (!otpInput.trim()) return;
    setPhoneBusy(true);
    setPhoneError(null);
    try {
      setVerification(await confirmPhoneOtp(otpInput.trim()));
      setOtpInput("");
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.link) router.push(n.link);
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "arena-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await signOut();
      router.replace("/");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell title="Settings" profile={profile}>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold"><Bot className="size-4 text-primary-soft" /> Autonomy</p>
            <p className="mb-4 text-xs text-muted-foreground">How much should your agent do without asking?</p>
            <div className="space-y-2.5">
              {AUTONOMY_OPTIONS.map(({ key, label, desc }) => {
                const locked = key === "autopilot" && !isPro;
                if (locked) {
                  return (
                    <div key={key} className="flex w-full items-start gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 opacity-60">
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
                      profile.autonomy === key ? "border-primary/60 bg-primary/10" : "border-border bg-secondary hover:border-primary/40",
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
          </Card>

          <Card>
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><ShieldCheck className="size-4 text-primary-soft" /> Consent</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Sparkles className="size-3.5 text-primary-soft" /> Auto-apply</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Let your agent apply to strong matches for you</span>
                </span>
                <Switch aria-label="Auto-apply" checked={profile.consent.autoApply} onCheckedChange={() => toggleConsent("autoApply")} disabled={saving} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Eye className="size-3.5 text-primary-soft" /> Visible to enterprises</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Show up in Talent Universe search results</span>
                </span>
                <Switch aria-label="Visible to enterprises" checked={profile.consent.searchableByEnterprises} onCheckedChange={() => toggleConsent("searchableByEnterprises")} disabled={saving} />
              </div>
            </div>
          </Card>

          <Card>
            <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold"><MapPin className="size-4 text-primary-soft" /> Location</p>
            <p className="mb-4 text-xs text-muted-foreground">Powers Feed and Map proximity - never stores your exact position, even server-side.</p>
            <div className="space-y-2.5">
              {LOCATION_OPTIONS.map(({ key, label, desc }) => (
                <div key={key}>
                  <button
                    type="button"
                    disabled={locationSaving}
                    onClick={() => setLocation(key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                      profile.locationConsent === key || (!profile.locationConsent && key === "off")
                        ? "border-primary/60 bg-primary/10" : "border-border bg-secondary hover:border-primary/40",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", (profile.locationConsent ?? "off") === key ? "border-primary-soft bg-primary-soft" : "border-border")} />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                  {key === "city" && (profile.locationConsent === "city" || cityInput) && (
                    <Input
                      value={cityInput || profile.homeCity || ""}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className="mt-1.5 ml-7 h-8 w-[calc(100%-1.75rem)] border-border bg-card text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
            {locationError && <p className="mt-2 text-xs text-red-400">{locationError}</p>}
          </Card>

          <Card>
            <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold"><ShieldCheck className="size-4 text-primary-soft" /> Verification &amp; safety</p>
            <p className="mb-4 text-xs text-muted-foreground">Required before joining or creating activities that meet up in person.</p>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-medium"><Cake className="size-3.5 text-primary-soft" /> Date of birth</p>
                <p className="mt-0.5 mb-2.5 text-xs text-muted-foreground">Self-declared, used only to block under-18s from activity meetups.</p>
                <div className="flex items-center gap-2">
                  <Input aria-label="Date of birth" type="date" value={dobInput} onChange={(e) => { setDobInput(e.target.value); setDobSaved(false); }} className="h-8 border-border bg-card text-xs" />
                  <Button variant="outline" size="sm" disabled={!dobInput || dobSaving} onClick={saveDob}>
                    {dobSaving ? "Saving…" : dobSaved ? "Saved ✓" : "Save"}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Phone className="size-3.5 text-primary-soft" /> Phone verification
                  {verification?.phoneVerified && <span className="text-[11px] font-normal text-emerald-400">· Verified</span>}
                </p>
                <p className="mt-0.5 mb-2.5 text-xs text-muted-foreground">Lets you create or join activities that require a verified phone.</p>
                {verification?.phoneVerified ? (
                  <p className="text-xs text-muted-foreground">{verification.phoneNumber}</p>
                ) : verification?.otpPending ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">Code sent to {verification.phoneNumber}. (Demo mode: the code is <span className="font-mono text-primary-soft">123456</span>.)</p>
                    <div className="flex items-center gap-2">
                      <Input value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="6-digit code" className="h-8 border-border bg-card text-xs" />
                      <Button variant="default" size="sm" disabled={!otpInput.trim() || phoneBusy} onClick={confirmOtp}>
                        {phoneBusy ? "Confirming…" : "Confirm"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+91 98765 43210" className="h-8 border-border bg-card text-xs" />
                    <Button variant="outline" size="sm" disabled={!phoneInput.trim() || phoneBusy} onClick={requestOtp}>
                      {phoneBusy ? "Sending…" : "Send code"}
                    </Button>
                  </div>
                )}
                {phoneError && <p className="mt-2 text-xs text-red-400">{phoneError}</p>}
              </div>
            </div>
          </Card>

          <Card>
            <p className="mb-1 flex items-center gap-2 font-display text-sm font-bold"><ShieldCheck className="size-4 text-primary-soft" /> Your data</p>
            <p className="mb-4 text-xs text-muted-foreground">Under India&apos;s DPDP Act, you can download a copy of what we hold on you or erase your account at any time.</p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-medium transition-colors hover:border-primary/40 disabled:opacity-50"
              >
                <Download className="size-3.5" /> {exporting ? "Preparing…" : "Export my data"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:border-red-500/50"
              >
                <Trash2 className="size-3.5" /> Delete my account
              </button>
            </div>
            {showDeleteConfirm && (
              <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm font-medium">This permanently erases your profile and signs you out everywhere.</p>
                <p className="mt-1 text-xs text-muted-foreground">Your name, bio, skills, and CV are removed. This can&apos;t be undone.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, delete everything"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-full border border-border px-4 py-1.5 text-xs font-medium hover:border-primary/40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-bold"><Waves className="size-4 text-primary-soft" /> Accessibility</p>
            <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary px-4 py-3">
              <span>
                <span className="block text-sm font-medium">Reduce motion effects</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Turns off the orb animation, particle nebula, and scroll reveals app-wide</span>
              </span>
              <Switch aria-label="Reduce motion effects" checked={reducedEffects} onCheckedChange={toggleReducedEffects} />
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-sm font-bold"><Bell className="size-4 text-primary-soft" /> Notifications</p>
            {notifications.some((n) => !n.read) && (
              <button type="button" onClick={markAllRead} className="text-xs font-medium text-primary-soft hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const Icon = NOTIF_ICONS[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn("flex w-full items-start gap-3 rounded-xl border border-border px-3.5 py-3 text-left transition-colors hover:border-primary/40", !n.read && "bg-primary/[0.04]")}
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-soft"><Icon className="size-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
            {notifications.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet.</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
