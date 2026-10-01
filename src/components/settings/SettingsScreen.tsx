"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { m } from "motion/react";
import { ChevronRight, LogOut } from "lucide-react";
import { IconBadge, type IconBadgeTone } from "@/components/bplus/IconBadge";
import { BellSolid, BlockSolid, BriefcaseSolid, HelpSolid, LockSolid, PinSolid, ShareSolid, ShieldSolid, SparkleSolid, TrashSolid, UserCardSolid } from "@/components/bplus/SolidIcons";
import { cn } from "@/lib/utils";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button } from "@/components/bplus/Button";
import { Skeleton, StateCard } from "@/components/bplus/Primitives";
import { Toggle } from "@/components/bplus/Controls";
import { AccountSheet, CareerSheet, JennySheet, LocationSheet, VerificationSheet, VisibilitySheet } from "@/components/settings/SettingsSheets";
import { getMyProfile } from "@/lib/api/profile";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";
import { getManualReducedEffects, setManualReducedEffects } from "@/hooks/use-reduced-motion";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile } from "@/lib/types";

type Glyph = typeof PinSolid;
type Sheet = "location" | "career" | "visibility" | "jenny" | "verification" | "account" | null;
const subscribeNothing = () => () => {};

function Row({ icon, tone, title, detail, onClick, href, danger }: { icon: Glyph; tone: IconBadgeTone; title: string; detail?: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const body = (
    <>
      <IconBadge icon={icon} tone={tone} size={40} />
      <span className="min-w-0 flex-1 text-left">
        <span className={cn("block text-[16px] font-semibold", danger && "text-danger-on-paper")}>{title}</span>
        {detail && <span className="block text-[14px] text-paper-ink-muted">{detail}</span>}
      </span>
      <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" aria-hidden />
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3.5 px-4 py-3 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
  return href ? <Link href={href} className={cls}>{body}</Link> : <button type="button" onClick={onClick} className={cls}>{body}</button>;
}

function Group({ title, children, index }: { title: string; children: ReactNode; index: number }) {
  return (
    <m.section variants={rise} custom={index} className="mt-6" aria-label={title}>
      <h2 className="mb-2 text-[17px] font-semibold">{title}</h2>
      <div className="divide-y divide-paper-ink/10 overflow-hidden rounded-tile bg-paper text-paper-ink">{children}</div>
    </m.section>
  );
}

/** Board "Messages, trust…" #5 — Settings & Privacy: a list of choices, each opening a short sheet
 *  with the same real controls as before (auth, consent and location logic unchanged). */
export function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  // `?sheet=jenny` — Jenny's "Permissions & data" opens straight on her permissions.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the URL once after hydration
    if (new URLSearchParams(window.location.search).get("sheet") === "jenny") setSheet("jenny");
  }, []);
  const sessionEmail = useSyncExternalStore(subscribeNothing, () => getSession()?.email ?? "", () => "");
  const [emailOverride, setEmailOverride] = useState<string | null>(null);
  const storedReduced = useSyncExternalStore(subscribeNothing, getManualReducedEffects, () => false);
  const [reducedOverride, setReducedOverride] = useState<boolean | null>(null);
  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile).catch(() => setError(true));
  }, [router]);

  const email = emailOverride ?? sessionEmail;
  const reduced = reducedOverride ?? storedReduced;

  if (error) {
    return (
      <AppShell>
        <div className="pt-10"><StateCard kind="error" title="Settings didn't load" detail="Check your connection and try again." action={<Button variant="outline" onClick={() => { setError(false); getMyProfile().then(setProfile).catch(() => setError(true)); }}>Try again</Button>} /></div>
      </AppShell>
    );
  }

  const locationDetail = !profile ? "" : profile.locationConsent === "precise" ? "Approximate, from this device" : profile.locationConsent === "city" ? `City only${profile.homeCity ? ` · ${profile.homeCity}` : ""}` : "Off";

  return (
    <AppShell>
      <h1 className="pt-3 font-display-serif text-[32px] font-medium leading-tight">Settings &amp; Privacy</h1>
      {!profile ? (
        <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading settings">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <m.div initial="hidden" animate="shown">
          <m.div variants={rise} custom={0}>
            <Link href="/identity" className="mt-5 flex items-center gap-3.5 rounded-tile bg-paper p-4 text-paper-ink">
              <Avatar name={profile.name} className="size-14 text-[18px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-semibold">{profile.name}</span>
                <span className="block text-[14px] text-paper-ink-muted">View and edit your profile</span>
              </span>
              <ChevronRight className="size-5 text-paper-ink-muted" aria-hidden />
            </Link>
          </m.div>

          <Group title="Privacy & visibility" index={1}>
            <Row icon={PinSolid} tone="blue" title="Location" detail={locationDetail} onClick={() => setSheet("location")} />
            <Row icon={BriefcaseSolid} tone="brown" title="Career visibility" detail={profile.consent.searchableByEnterprises ? "Visible to employers" : "Hidden from employers"} onClick={() => setSheet("career")} />
            <Row icon={ShieldSolid} tone="blue" title="Profile visibility" detail="Who can find and open your profile" onClick={() => setSheet("visibility")} />
            <Row icon={SparkleSolid} tone="jenny" title="Jenny's permissions" detail={profile.autonomy === "manual" ? "Only when I ask · you approve" : "Jenny prepares, you approve"} onClick={() => setSheet("jenny")} />
            <Row icon={ShieldSolid} tone="green" title="Verification & safety" detail="Date of birth, phone" onClick={() => setSheet("verification")} />
            <Row icon={ShareSolid} tone="jenny" title="Share profile" detail="Send a link to your public profile" href="/account/share" />
          </Group>

          <Group title="Account & data" index={2}>
            <Row icon={UserCardSolid} tone="blue" title="Edit profile" detail="Name, title, interests, photo" href="/account/edit" />
            <Row icon={LockSolid} tone="slate" title="Email & password" detail={email || undefined} onClick={() => setSheet("account")} />
            <Row icon={UserCardSolid} tone="blue" title="Download my data" detail="A copy of what Arena holds about you" href="/account/export" />
            <Row icon={BlockSolid} tone="amber" title="Blocked accounts" detail="Manage people you've blocked" href="/account/blocked" />
            <Row icon={TrashSolid} tone="red" title="Delete account" detail="Permanently remove your data" href="/account/delete" danger />
          </Group>

          <Group title="Notifications" index={3}>
            <Row icon={BellSolid} tone="orange" title="Notifications" detail="See and clear your notifications" href="/notifications" />
            <Row icon={BellSolid} tone="orange" title="Notification preferences" detail="Choose what Arena notifies you about" href="/account/notifications" />
          </Group>

          <Group title="Help" index={4}>
            <Row icon={HelpSolid} tone="green" title="Help & safety" detail="Staying safe, reporting, your data" href="/account/help" />
          </Group>

          <m.section variants={rise} custom={5} className="mt-6" aria-label="Accessibility">
            <h2 className="mb-2 text-[17px] font-semibold">Accessibility</h2>
            <div className="rounded-tile bg-surface px-4 py-2">
              <Toggle
                label="Reduce motion effects"
                description={<p className="text-[13px] text-faint">Calmer transitions across the app, on this device.</p>}
                checked={reduced}
                onChange={(v) => {
                  setReducedOverride(v);
                  setManualReducedEffects(v);
                }}
              />
            </div>
          </m.section>

          <m.div variants={rise} custom={6} className="mt-8">
            <Button variant="outline" onClick={() => void signOut().then(() => router.replace("/auth?mode=signin"))}>
              <LogOut className="size-5" aria-hidden /> Sign out
            </Button>
          </m.div>

          <LocationSheet open={sheet === "location"} onClose={() => setSheet(null)} profile={profile} onProfile={setProfile} />
          <CareerSheet open={sheet === "career"} onClose={() => setSheet(null)} profile={profile} onProfile={setProfile} />
          <VisibilitySheet open={sheet === "visibility"} onClose={() => setSheet(null)} />
          <JennySheet open={sheet === "jenny"} onClose={() => setSheet(null)} profile={profile} onProfile={setProfile} />
          <VerificationSheet open={sheet === "verification"} onClose={() => setSheet(null)} />
          <AccountSheet open={sheet === "account"} onClose={() => setSheet(null)} email={email} onEmail={setEmailOverride} />
        </m.div>
      )}
    </AppShell>
  );
}
