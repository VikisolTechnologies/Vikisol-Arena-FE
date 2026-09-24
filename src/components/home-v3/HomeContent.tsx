"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, MessagesSquare, Briefcase, Hammer, ChevronRight, MapPinned, Bell, Inbox, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { getMyProfile } from "@/lib/api/profile";
import { getNearby } from "@/lib/api/posts";
import { getNotifications } from "@/lib/api/notifications";
import { getMyRooms } from "@/lib/api/rooms";
import { getConversations } from "@/lib/api/messages";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { formatTimeAgo } from "@/lib/format";
import type { AppNotification, CandidateProfile } from "@/lib/types";

// Same city-center fallback Nearby uses when there's no saved location.
const HYDERABAD_CENTER = { lat: 17.385, lng: 78.4867 };

type QuickAction = {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  lands: string;
  href?: string;
};

// The four things people come to Arena for, each landing in the one space that owns it.
const QUICK_ACTIONS: QuickAction[] = [
  { key: "activity", icon: Users, title: "Start an activity", description: "Get people nearby to play, meet up or do something together", lands: "Nearby" },
  { key: "discuss", icon: MessagesSquare, title: "Ask the community", description: "Questions, recommendations, or just start a conversation", lands: "Discuss", href: "/discuss" },
  { key: "jobs", icon: Briefcase, title: "Find a job", description: "Open roles, ranked by how well they fit your profile", lands: "Work", href: "/work" },
  { key: "build", icon: Hammer, title: "Get something built", description: "Post a project and compare bids from freelancers", lands: "Work", href: "/work?tab=bidding" },
];

function greetingFor(hour: number) {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Jenny - Arena's home (restructure Phase 1). Deliberately NOT a feed: every kind of content now
 * has its own space (activities on Nearby, threads in Discuss, jobs and bidding in Work,
 * conversations in Inbox). This screen answers two questions instead - "what do you want to
 * do?" and "what needs you?" - and points at Nearby rather than repeating its contents.
 *
 * Jenny's conversational input is honestly disabled until JennySol is connected (Phase 3); the
 * four actions below it are real and go straight to the flow each one names.
 */
export function HomeContent() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [unreadConversations, setUnreadConversations] = useState<number | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  useEffect(() => {
    // Client-only: time of day is the viewer's, and SSR has no session to read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingFor(new Date().getHours()));
    setSignedIn(!!getSession());
  }, []);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    (async () => {
      let center = HYDERABAD_CENTER;
      if (getSession()) {
        const p = await getMyProfile().catch(() => null);
        if (cancelled) return;
        setProfile(p);
        if (p?.approxLat != null && p?.approxLng != null) center = { lat: p.approxLat, lng: p.approxLng };

        getNotifications()
          .then((all) => !cancelled && setNotifications(all.filter((n) => !n.read).slice(0, 5)))
          .catch(() => !cancelled && setNotifications([]));
        Promise.all([getMyRooms().catch(() => []), getConversations().catch(() => [])]).then(([rooms, convos]) => {
          if (!cancelled) setUnreadConversations(rooms.filter((r) => r.unread).length + convos.filter((c) => c.unread).length);
        });
      }
      getNearby({ lat: center.lat, lng: center.lng, radiusKm: 10, withinHours: 24, intentType: "activity" })
        .then((posts) => !cancelled && setNearbyCount(posts.length))
        .catch(() => !cancelled && setNearbyCount(0));
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function startActivity() {
    if (!getSession()) {
      setSignInPromptOpen(true);
      return;
    }
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const heading = signedIn ? (greeting ? `${greeting}${firstName ? `, ${firstName}` : ""}` : " ") : "Welcome to Arena";
  const nothingNeedsYou = notifications !== null && notifications.length === 0 && unreadConversations === 0;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8">
        <header className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jenny</p>
          <h1 className="font-display text-[26px] font-semibold leading-tight text-foreground sm:text-[30px]">{heading}</h1>
          <p className="text-[14px] text-muted-foreground">What would you like to do?</p>
        </header>

        {/* Jenny's conversational entry - honestly disabled until JennySol is connected. */}
        <section aria-label="Ask Jenny" className="relative overflow-hidden rounded-2xl border border-border bg-card p-4">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(255,107,53,0.28),transparent_70%)]" />
          <div className="relative flex items-center gap-3">
            <div aria-hidden className="size-9 shrink-0 rounded-full bg-[radial-gradient(circle_at_32%_30%,var(--primary-soft),var(--primary)_70%)]" />
            <label htmlFor="jenny-input" className="sr-only">Tell Jenny what you want to do</label>
            <input
              id="jenny-input"
              type="text"
              disabled
              placeholder="Tell Jenny what you want to do…"
              className="min-w-0 flex-1 cursor-not-allowed rounded-full border border-border bg-background/60 px-4 py-2.5 text-[14px] text-muted-foreground placeholder:text-muted-foreground"
            />
          </div>
          <p className="relative mt-3 text-[12px] text-muted-foreground">
            Soon you&apos;ll just say it — by voice or text — and Jenny will plan it with you. For now, pick one of these:
          </p>
        </section>

        <section aria-label="What you can do" className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            const inner = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{a.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{a.description}</span>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">In {a.lands}</span>
                </span>
              </>
            );
            const cls = "flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary";
            return a.href ? (
              <Link key={a.key} href={a.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={a.key} type="button" onClick={startActivity} className={cls}>
                {inner}
              </button>
            );
          })}
        </section>

        <section aria-label="Needs you" className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Needs you</h2>
          {!signedIn ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-muted-foreground">Sign in to see replies, bid updates and invites waiting for you.</p>
              <Button size="sm" render={<Link href="/auth" />} nativeButton={false}>
                Sign in
              </Button>
            </div>
          ) : notifications === null || unreadConversations === null ? (
            <div className="h-20 animate-pulse rounded-2xl bg-card" />
          ) : nothingNeedsYou ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-[14px] text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {unreadConversations > 0 && (
                <Link href="/rooms" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:bg-secondary">
                  <Inbox className="size-4 shrink-0 text-foreground" />
                  <span className="flex-1 text-[14px] text-foreground">
                    {unreadConversations} conversation{unreadConversations === 1 ? "" : "s"} waiting in Inbox
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              )}
              {notifications.map((n) => (
                <Link key={n.id} href={n.link ?? "/notifications"} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:bg-secondary">
                  <Bell className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-foreground">{n.title}</span>
                    {n.body && <span className="mt-0.5 block line-clamp-2 text-[13px] text-muted-foreground">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatTimeAgo(n.timestamp)}</span>
                </Link>
              ))}
              {notifications.length > 0 && (
                <Link href="/notifications" className="self-start text-[13px] font-medium text-muted-foreground hover:text-foreground">
                  All notifications →
                </Link>
              )}
            </div>
          )}
        </section>

        <section aria-label="Around you" className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Around you</h2>
          <Link href="/map" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-secondary">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
              <MapPinned className="size-5 text-foreground" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-foreground">
                {nearbyCount === null
                  ? "Checking what's on nearby…"
                  : nearbyCount === 0
                    ? "Nothing on near you today"
                    : `${nearbyCount} activit${nearbyCount === 1 ? "y" : "ies"} near you today`}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                {nearbyCount === 0 ? "Open Nearby to widen the radius, or start one." : "Open Nearby to see them on the map and join."}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>
      </div>

      <CreateComposer
        key={composerSession}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={() => router.push("/map")}
        initialIntent="activity"
      />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="start an activity" />
    </AppShell>
  );
}
