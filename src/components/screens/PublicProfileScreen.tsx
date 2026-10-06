"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { m } from "motion/react";
import { ArrowLeft, Flag, MapPin, ShieldCheck, UserCheck, UserPlus } from "lucide-react";
import { rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { ReportSheet } from "@/components/trust/ReportSheet";
import { useGuest } from "@/hooks/use-arena-session";
import { follow, getCounts, unfollow } from "@/lib/api/follows";
import { getPublicProfile } from "@/lib/api/profile";
import { loadProfileActivity, type ProfileActivity as ActivityData } from "@/lib/api/profileActivity";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { getSession } from "@/lib/session";
import type { PublicCandidateProfile } from "@/lib/types";

const VERIFIED: Record<string, string> = { phone: "Phone verified", id: "ID verified" };

/** Someone else's profile (flow §12), in B+. Shows only what the person chose to share, and never a
 *  score. Hidden or unknown profiles (and Nearby-only ones, to signed-out visitors) are simply
 *  "not available" — the page can't tell you which. */
export function PublicProfileScreen({ id }: { id: string }) {
  const router = useRouter();
  const guest = useGuest();
  const [profile, setProfile] = useState<PublicCandidateProfile | null | undefined>(undefined);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPublicProfile(id).then((p) => !cancelled && setProfile(p ?? null)).catch(() => !cancelled && setProfile(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Your own profile is the You tab, not a thinner copy of it.
  useEffect(() => {
    if (getSession()?.candidateId === id) router.replace("/identity");
  }, [id, router]);

  const visible = !!profile && profile.visibility !== "hidden" && !(profile.visibility === "nearby" && guest);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadProfileActivity(id).then((a) => !cancelled && setActivity(a)).catch(() => !cancelled && setActivity({ posts: [], projects: [], outcomes: [], stats: null }));
    if (!getSession()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- signed-out visitors can't follow
      setFollowing(false);
    } else {
      getCounts(id).then((c) => !cancelled && setFollowing(!!c.viewerFollows)).catch(() => !cancelled && setFollowing(false));
    }
    return () => {
      cancelled = true;
    };
  }, [id, visible]);

  const toggleFollow = async () => {
    if (following === null) return;
    const next = !following;
    setFollowing(next);
    try {
      await (next ? follow(id) : unfollow(id));
    } catch {
      setFollowing(!next);
    }
  };

  const back = (
    <button type="button" onClick={() => router.back()} aria-label="Back" className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-background/50 text-foreground backdrop-blur">
      <ArrowLeft className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );

  if (profile === undefined || guest === null) {
    return (
      <AppShell>
        <div className="space-y-3 pt-6" aria-busy="true" aria-label="Loading the profile">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
      </AppShell>
    );
  }

  if (!visible) {
    return (
      <AppShell>
        <div className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] h-16">{back}</div>
        <div className="pt-6">
          <StateCard
            kind="empty"
            title="This profile isn't available"
            detail="They may have set it to private, or the link is wrong."
            action={profile?.visibility === "nearby" && guest ? <ButtonLink href="/auth?mode=signin">Sign in</ButtonLink> : undefined}
          />
        </div>
      </AppShell>
    );
  }

  const area = profile.homeCity ?? profile.location;
  const verified = VERIFIED[profile.verificationLevel] ?? (profile.phoneVerified ? VERIFIED.phone : null);

  return (
    <AppShell>
      <div className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] h-40 overflow-hidden">
        <Image src="/brand/welcome-park.webp" alt="" fill sizes="480px" className="object-cover object-[50%_25%]" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
        {back}
      </div>
      <m.div initial="hidden" animate="shown">
        <m.div variants={rise} custom={0} className="relative z-10 -mt-14">
          <Avatar name={profile.name} className="size-24 border-4 border-background text-[30px]" eager />
        </m.div>
        <m.div variants={rise} custom={1}>
          <h1 className="mt-3 font-display-serif text-[30px] font-medium leading-tight">{profile.name}</h1>
          {(profile.title || area) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[14px] text-faint">
              {profile.title && <span>{profile.title}{area ? " ·" : ""}</span>}
              {area && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4 text-success-on-dark" strokeWidth={1.75} aria-hidden />
                  {area}
                </span>
              )}
            </p>
          )}
          {verified && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-success-on-dark">
              <ShieldCheck className="size-4" aria-hidden /> {verified}
            </p>
          )}
        </m.div>

        <m.div variants={rise} custom={2} className="mt-5 grid grid-cols-[1fr_1fr] gap-3">
          {guest ? (
            <ButtonLink href="/auth?mode=signin" className="h-12 px-3 text-[16px]">
              <UserPlus className="size-5" aria-hidden /> Follow
            </ButtonLink>
          ) : (
            <Button type="button" onClick={toggleFollow} disabled={following === null} aria-pressed={!!following} variant={following ? "outline" : "primary"} className="h-12 px-3 text-[16px]">
              {following ? <UserCheck className="size-5" aria-hidden /> : <UserPlus className="size-5" aria-hidden />} {following ? "Following" : "Follow"}
            </Button>
          )}
          <ButtonLink href={guest ? "/auth?mode=signin" : `/rooms?with=${encodeURIComponent(profile.id)}`} variant="outline" className="h-12 px-3 text-[16px]">
            Message
          </ButtonLink>
        </m.div>
        {!guest && (
          <button type="button" onClick={() => setReportOpen(true)} className="mx-auto mt-2 flex min-h-11 items-center gap-2 px-3 text-[14px] text-faint underline underline-offset-4">
            <Flag className="size-4" aria-hidden /> Report
          </button>
        )}

        {profile.bio && (
          <m.section variants={rise} custom={3} className="mt-6" aria-label="Intro">
            <SectionHeader title="Intro" />
            <p className="text-[16px] leading-relaxed text-foreground/90">{profile.bio}</p>
          </m.section>
        )}

        {profile.skills.length > 0 && (
          <m.section variants={rise} custom={4} className="mt-6" aria-label="Interests">
            <SectionHeader title="Interests & skills" />
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li key={s.name} className="rounded-full border border-field-line px-3 py-1.5 text-[14px]">{s.name}</li>
              ))}
            </ul>
          </m.section>
        )}

        <m.div variants={rise} custom={5}>
          {activity === null ? <Skeleton className="mt-6 h-24 w-full" /> : (
            <ProfileActivity posts={activity.posts} projects={activity.projects} outcomes={activity.outcomes} stats={activity.stats} />
          )}
        </m.div>
      </m.div>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} target={{ kind: "profile", id: profile.id }} person={{ userId: profile.id, name: profile.name, detail: profile.title }} />
    </AppShell>
  );
}
