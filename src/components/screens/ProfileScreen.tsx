"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Briefcase, ChevronRight, Lock, LogOut, MapPin, Plus, Settings, Share2 } from "lucide-react";
import { dissolve, rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { useGuest } from "@/hooks/use-arena-session";
import { getMyProfile, type CandidateProfile } from "@/lib/data/profile";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { getJoinedPosts, getMyPosts } from "@/lib/api/posts";
import { loadProfileActivity, type ProfileActivity as ActivityData } from "@/lib/api/profileActivity";
import { ProfileActivity } from "@/components/profile/ProfileActivity";
import { getMyBids } from "@/lib/api/myBids";
import { signOut } from "@/lib/api/auth";
import type { Post } from "@/lib/types";
import { Outcomes } from "@/components/profile/Outcomes";
import { CountUp } from "@/components/bplus/CountUp";

const PROFILE_TABS = [
  { id: "for-you", label: "For you" },
  { id: "about", label: "About" },
  { id: "impact", label: "Impact" },
] as const;
type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

type Data = { profile: CandidateProfile; posts: Post[]; joined: Post[]; won: number; outcomes: Post[]; activity: ActivityData };

export function ProfileScreen() {
  const router = useRouter();
  const guest = useGuest();
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<ProfileTab>("for-you");

  useEffect(() => {
    if (guest !== false) return;
    let cancelled = false;
    Promise.all([getMyProfile(), getMyPosts(), getJoinedPosts().catch(() => []), getMyBids().catch(() => [])])
      .then(async ([profile, rawPosts, rawJoined, rawBids]) => {
        if (cancelled) return;
        // One malformed source shouldn't blank the page; treat it as empty.
        const list = <T,>(v: T[] | unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        const posts = list<Post>(rawPosts);
        const joined = list<Post>(rawJoined);
        const bids = list<{ status: string }>(rawBids);
        const now = Date.now();
        const outcomes = [...posts, ...joined].filter((p) => p.status === "closed" || (p.startsAt && new Date(p.startsAt).getTime() < now)).slice(0, 8);
        const activity = await loadProfileActivity(profile.id).catch(() => ({ posts: [], projects: [], outcomes: [], stats: null }));
        if (cancelled) return;
        setError(null);
        setData({ profile, posts, joined, won: bids.filter((b) => b.status === "won").length, outcomes, activity });
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Your profile didn't load."));
    return () => {
      cancelled = true;
    };
  }, [guest, attempt]);

  if (guest) {
    return (
      <AppShell>
        <div className="pt-10">
          <StateCard kind="empty" title="Sign in to see your page" detail="Your name, what you've done nearby and who can see it — all in one place." action={<ButtonLink href="/auth?mode=signin">Sign in</ButtonLink>} />
        </div>
      </AppShell>
    );
  }

  const name = data?.profile.name || draft.displayName || "";
  const area = (draft.area || data?.profile.homeCity || "").split(" / ")[0];
  const bio = draft.intro || data?.profile.bio;
  const title = draft.title || data?.profile.title;
  const hosted = data?.activity.stats?.hosted ?? data?.posts.filter((p) => p.intentType === "activity").length ?? 0;
  const joined = data?.activity.stats?.joined ?? data?.joined.filter((p) => p.intentType === "activity").length ?? 0;
  const helped = data?.activity.stats?.helped ?? data?.joined.filter((p) => p.intentType === "ask").length ?? 0;
  const projects = data?.activity.stats?.projects ?? data?.won ?? 0;
  const outcomes = data?.outcomes ?? [];
  // The career layer counts as open once the person said they came for work or chose to be findable.
  const careerOpen = !!(data?.profile.cameForJob || data?.profile.consent?.searchableByEnterprises);

  return (
    <AppShell>
      <div className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] h-40 overflow-hidden">
        <Image src="/brand/welcome-park.webp" alt="" fill sizes="480px" className="object-cover object-[50%_25%]" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
        <div className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] flex gap-2">
          <Link href="/account/share" aria-label="Share profile" className="grid size-11 place-items-center rounded-full bg-background/50 text-foreground backdrop-blur">
            <Share2 className="size-5" strokeWidth={1.75} aria-hidden />
          </Link>
          <Link href="/settings" aria-label="Settings" className="grid size-11 place-items-center rounded-full bg-background/50 text-foreground backdrop-blur">
            <Settings className="size-5" strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>

      {error ? (
        <StateCard kind="error" title="Your profile didn't load" detail={error} action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
      ) : !data ? (
        <div className="-mt-14 space-y-3" aria-busy="true" aria-label="Loading your profile">
          {/* The face is known before the profile arrives (device draft), so it never flashes grey. */}
          {draft.photo || draft.displayName ? (
            <Avatar src={draft.photo} name={draft.displayName || "You"} className="relative z-10 size-24 border-4 border-background text-[30px]" />
          ) : (
            <Skeleton className="size-24 rounded-full" />
          )}
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <m.div initial="hidden" animate="shown">
          <m.div variants={rise} custom={0} className="relative z-10 -mt-14 flex items-end justify-between">
            <Avatar src={draft.photo} name={name} className="size-24 border-4 border-background text-[30px]" />
            <ButtonLink href="/account/edit" variant="outline" className="mb-1 h-10 w-auto px-5 text-[15px]">Edit</ButtonLink>
          </m.div>
          <m.div variants={rise} custom={1}>
            <h1 className="mt-3 font-display-serif text-[30px] font-medium leading-tight">{name}</h1>
            {(title || area) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[14px] text-faint">
                {title && <span>{title} ·</span>}
                {area && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4 text-success-on-dark" strokeWidth={1.75} aria-hidden />
                    {area}
                  </span>
                )}
              </p>
            )}
          </m.div>

          <m.dl variants={rise} custom={2} className="mt-5 grid grid-cols-4 divide-x divide-line rounded-[var(--radius-card)] border border-line bg-surface py-3 text-center">
            {[
              ["Hosted", hosted],
              ["Joined", joined],
              ["Helped", helped],
              ["Projects", projects],
            ].map(([label, n]) => (
              <div key={label}>
                <dd className="font-display-serif text-[24px] font-medium"><CountUp value={n as number} /></dd>
                <dt className="text-[13px] text-faint">{label}</dt>
              </div>
            ))}
          </m.dl>

          {/* Career board "My Profile": For you · About · Impact. */}
          <m.div variants={rise} custom={3} className="mt-5">
            <Pills label="Profile" tone="cream" segmented options={PROFILE_TABS} value={tab} onChange={setTab} />
          </m.div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={dissolve}>
              {tab === "for-you" && (
                <>
                  <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-surface p-4" aria-label="About me">
                    <p className="font-display-serif text-[22px] font-medium leading-snug">A kinder neighbourhood, brighter tomorrows.</p>
                    {bio ? <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{bio}</p> : <Link href="/identity/edit" className="mt-2 inline-flex min-h-11 items-center text-[15px] underline underline-offset-4">Add a short intro</Link>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.interests.map((i) => (
                        <span key={i} className="inline-flex h-9 items-center rounded-full border border-field-line px-3.5 text-[14px]">{i}</span>
                      ))}
                      <Link href="/onboarding?step=2" aria-label="Add interests" className="relative grid size-9 place-items-center rounded-full border border-field-line after:absolute after:-inset-1">
                        <Plus className="size-4" strokeWidth={2} aria-hidden />
                      </Link>
                    </div>
                  </section>
                  <ProfileActivity posts={data.activity.posts} joined={data.joined} projects={data.activity.projects} outcomes={data.activity.outcomes} stats={data.activity.stats} counts={false} />
                  <Outcomes outcomes={outcomes.slice(0, 3)} seeAll />
                  <Link href={careerOpen ? "/identity/career?step=setup" : "/identity/career"} className="mt-6 flex items-center gap-3.5 rounded-tile border-2 border-primary bg-paper p-4 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-white">
                      <Briefcase className="size-7" strokeWidth={1.9} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[18px] font-semibold">{careerOpen ? "Career profile" : "Open career profile"}</span>
                      <span className="block text-[14px] text-paper-ink-muted">{careerOpen ? (data?.profile.consent?.searchableByEnterprises ? "Open to work · visible to employers" : "Set up · not visible to employers") : "Explore opportunities when you're ready."}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" aria-hidden />
                  </Link>
                </>
              )}

              {tab === "about" && (
                <>
                  <section className="mt-5" aria-label="Availability">
                    <SectionHeader title="Availability" action={<Link href="/onboarding?step=3" className="inline-flex min-h-11 items-center rounded-full px-3 text-[14px] underline underline-offset-4">Edit</Link>} />
                    <div className="flex flex-wrap gap-2">
                      {(draft.availability.length ? draft.availability : ["Not set yet"]).map((a) => (
                        <span key={a} className="inline-flex h-9 items-center rounded-full bg-paper px-4 text-[14px] font-medium text-paper-ink">{a}</span>
                      ))}
                    </div>
                  </section>
                  <dl className="mt-6 space-y-3 text-[15px]">
                    <div><dt className="text-[13px] text-faint">Area</dt><dd>{draft.area || data.profile.homeCity || "Not set"}</dd></div>
                    <div><dt className="text-[13px] text-faint">Title</dt><dd>{title || "Not set"}</dd></div>
                    <div>
                      <dt className="flex items-center justify-between text-[13px] text-faint">
                        Skills
                        <Link href="/identity/edit" className="inline-flex min-h-11 items-center text-[14px] font-normal normal-case text-foreground underline underline-offset-4">Edit</Link>
                      </dt>
                      <dd>{data.profile.skills.length ? data.profile.skills.map((x) => x.name).join(", ") : "Not added yet"}</dd>
                    </div>
                  </dl>
                  {(draft.interests.length > 0 || draft.photo || draft.availability.length > 0) && (
                    <p className="mt-3 text-[12px] text-faint">Interests, photo and availability are saved on this device for now.</p>
                  )}
                  <section className="mt-7" aria-label="Privacy and visibility">
                    <SectionHeader title="Privacy & visibility" action={<Link href="/settings" className="inline-flex min-h-11 items-center text-[14px] underline underline-offset-4">Manage</Link>} />
                    <p className="flex items-start gap-3 text-[14px] text-faint">
                      <Lock className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
                      <span>
                        People on Arena see your name, area and what you&apos;ve done here — never your exact location.
                        <br />
                        You control what else you share.
                      </span>
                    </p>
                  </section>
                </>
              )}

              {tab === "impact" && (
                <>
                  <p className="mt-4 text-[15px] text-foreground/90">
                    {hosted + joined + helped === 0
                      ? "Your impact shows here once you host, join or help with something nearby."
                      : `You've hosted ${hosted}, joined ${joined} and helped with ${helped} ${helped === 1 ? "need" : "needs"} nearby.`}
                  </p>
                  <Outcomes outcomes={outcomes} />
                </>
              )}
            </m.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => void signOut().then(() => router.push("/auth?mode=signin"))}
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-foreground/85"
          >
            <LogOut className="size-5" strokeWidth={1.75} aria-hidden />
            Sign out
          </button>
        </m.div>
      )}
    </AppShell>
  );
}
