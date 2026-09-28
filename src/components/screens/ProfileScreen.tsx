"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, m, useReducedMotion } from "motion/react";
import { Briefcase, ChevronRight, Lock, LogOut, MapPin, Plus, Settings } from "lucide-react";
import { countUp, rise } from "@/lib/motion";
import { AppShell } from "@/components/bplus/AppShell";
import { Avatar } from "@/components/bplus/Avatar";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { SectionHeader, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { useGuest } from "@/hooks/use-arena-session";
import { getMyProfile, type CandidateProfile } from "@/lib/data/profile";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { whenLabel } from "@/lib/data/feed";
import { getJoinedPosts, getMyPosts } from "@/lib/api/posts";
import { getMyBids } from "@/lib/api/myBids";
import { signOut } from "@/lib/api/auth";
import type { Post } from "@/lib/types";
import { Cover } from "@/components/covers/Cover";

type Data = { profile: CandidateProfile; posts: Post[]; joined: Post[]; won: number; outcomes: Post[] };

export function ProfileScreen() {
  const router = useRouter();
  const guest = useGuest();
  const draft = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (guest !== false) return;
    let cancelled = false;
    Promise.all([getMyProfile(), getMyPosts(), getJoinedPosts().catch(() => []), getMyBids().catch(() => [])])
      .then(([profile, rawPosts, rawJoined, rawBids]) => {
        if (cancelled) return;
        // One malformed source shouldn't blank the page; treat it as empty.
        const list = <T,>(v: T[] | unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
        const posts = list<Post>(rawPosts);
        const joined = list<Post>(rawJoined);
        const bids = list<{ status: string }>(rawBids);
        const now = Date.now();
        const outcomes = [...posts, ...joined].filter((p) => p.status === "closed" || (p.startsAt && new Date(p.startsAt).getTime() < now)).slice(0, 4);
        setError(null);
        setData({ profile, posts, joined, won: bids.filter((b) => b.status === "won").length, outcomes });
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
  const area = draft.area || data?.profile.homeCity || "";
  const bio = data?.profile.bio || draft.intro;
  const hosted = data?.posts.filter((p) => p.intentType === "activity").length ?? 0;
  const joined = data?.joined.filter((p) => p.intentType === "activity").length ?? 0;
  const helped = data?.joined.filter((p) => p.intentType === "ask").length ?? 0;
  const outcomes = data?.outcomes ?? [];
  // The career layer counts as open once the person said they came for work or chose to be findable.
  const careerOpen = !!(data?.profile.cameForJob || data?.profile.consent?.searchableByEnterprises);

  return (
    <AppShell>
      <div className="relative -mx-5 -mt-[max(8px,env(safe-area-inset-top))] h-40 overflow-hidden">
        <Image src="/brand/welcome-hero.jpg" alt="" fill sizes="480px" className="object-cover object-[50%_30%]" />
        <div aria-hidden className="absolute inset-0 bg-linear-to-b from-transparent to-background" />
        <Link href="/settings" aria-label="Settings" className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-background/50 text-foreground backdrop-blur">
          <Settings className="size-5" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      {error ? (
        <StateCard kind="error" title="Your profile didn't load" detail={error} action={<Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />
      ) : !data ? (
        <div className="-mt-12 space-y-3" aria-busy="true" aria-label="Loading your profile">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <m.div initial="hidden" animate="shown">
          <m.div variants={rise} custom={0} className="relative z-10 -mt-14 flex items-end justify-between">
            <Avatar src={draft.photo} name={name} className="size-24 border-4 border-background text-[30px]" />
            <ButtonLink href="/identity/edit" variant="outline" className="mb-1 h-10 w-auto px-5 text-[15px]">Edit</ButtonLink>
          </m.div>
          <m.div variants={rise} custom={1}>
            <h1 className="mt-3 font-display-serif text-[30px] font-medium leading-tight">{name}</h1>
            {area && (
              <p className="mt-1 flex items-center gap-1 text-[14px] text-faint">
                <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
                {area}
              </p>
            )}
            {bio && <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">{bio}</p>}
          </m.div>

          <m.div variants={rise} custom={2} className="mt-4 flex flex-wrap gap-2">
            {draft.interests.map((i) => (
              <span key={i} className="inline-flex h-9 items-center rounded-full border border-field-line px-3.5 text-[14px]">{i}</span>
            ))}
            <Link href="/onboarding?step=2" aria-label="Add interests" className="grid size-9 place-items-center rounded-full border border-field-line">
              <Plus className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </m.div>
          {(draft.interests.length > 0 || draft.photo || draft.availability.length > 0) && (
            <p className="mt-2 text-[12px] text-faint">Interests, photo and availability are saved on this device for now.</p>
          )}

          <m.dl variants={rise} custom={3} className="mt-5 grid grid-cols-4 divide-x divide-line rounded-[var(--radius-card)] border border-line bg-surface py-3 text-center">
            {[
              ["Hosted", hosted],
              ["Joined", joined],
              ["Helped", helped],
              ["Projects", data.won],
            ].map(([label, n]) => (
              <div key={label}>
                <dd className="font-display-serif text-[24px] font-medium"><CountUp value={n as number} /></dd>
                <dt className="text-[13px] text-faint">{label}</dt>
              </div>
            ))}
          </m.dl>

          <m.section variants={rise} custom={4} className="mt-6" aria-label="Availability">
            <SectionHeader title="Availability" action={<Link href="/onboarding?step=3" className="inline-flex min-h-11 items-center rounded-full px-3 text-[14px] underline underline-offset-4">Edit</Link>} />
            <div className="flex flex-wrap gap-2">
              {(draft.availability.length ? draft.availability : ["Not set yet"]).map((a) => (
                <span key={a} className="inline-flex h-9 items-center rounded-full bg-paper px-4 text-[14px] font-medium text-paper-ink">{a}</span>
              ))}
            </div>
          </m.section>

          <m.section variants={rise} custom={5} className="mt-7" aria-label="Recent outcomes">
            <SectionHeader title="Recent outcomes" />
            {outcomes.length === 0 ? (
              <p className="text-[14px] text-faint">Outcomes show here once a need is resolved or an activity happens.</p>
            ) : (
              <ul className="space-y-3">
                {outcomes.map((p) => (
                  <li key={p.id}>
                    <Link href={`/feed/${p.id}`} className="flex items-center gap-3 rounded-tile outline-none focus-visible:outline-2 focus-visible:outline-primary">
                      <Cover source={{ id: p.id, kind: p.intentType, media: p.mediaUrls[0], tags: p.tags, title: p.title, body: p.body, startsAt: p.startsAt }} className="size-14 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium">{p.title || p.body.slice(0, 60)}</span>
                        <span className="block text-[13px] text-faint">{[p.locationText, whenLabel(p.startsAt ?? p.createdAt)].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </m.section>

          <m.div variants={rise} custom={6} className="mt-7">
            <Link href={careerOpen ? "/identity/career?step=setup" : "/identity/career"} className="flex items-center gap-3.5 rounded-tile bg-paper p-4 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white">
                <Briefcase className="size-6" strokeWidth={1.9} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{careerOpen ? "Career profile" : "Open career profile"}</span>
                <span className="block text-[14px] text-paper-ink-muted">{careerOpen ? (data?.profile.consent?.searchableByEnterprises ? "Open to work · visible to employers" : "Set up · not visible to employers") : "Explore opportunities when you're ready."}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-paper-ink-muted" aria-hidden />
            </Link>
          </m.div>

          <m.section variants={rise} custom={7} className="mt-7" aria-label="Privacy and visibility">
            <SectionHeader title="Privacy & visibility" action={<Link href="/settings" className="inline-flex min-h-11 items-center text-[14px] underline underline-offset-4">Manage</Link>} />
            <p className="flex items-start gap-3 text-[14px] text-faint">
              <Lock className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>
                People on Arena see your name, area and what you&apos;ve done here — never your exact location.
                <br />
                You control what else you share.
              </span>
            </p>
          </m.section>

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

/** Counts up once on mount; instant under reduced motion. */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduced || value === 0) {
      ref.current.textContent = String(value);
      return;
    }
    const controls = animate(0, value, { ...countUp, onUpdate: (v) => ref.current && (ref.current.textContent = String(Math.round(v))) });
    return () => controls.stop();
  }, [value, reduced]);
  return <span ref={ref}>{value}</span>;
}
