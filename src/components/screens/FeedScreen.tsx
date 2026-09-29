"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Bell, CloudSun, LoaderCircle, MapPin, MessageCircle, Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/bplus/AppShell";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { HeroActivityCard, NeedCard, RowCard } from "@/components/cards/FeedCards";
import { dissolve, rise } from "@/lib/motion";
import { LAUNCH_ZONE, distanceKm, filterFeed, getFeedItems, originFor, type FeedFilter, type FeedItem } from "@/lib/data/feed";
import { getMyProfile } from "@/lib/data/profile";
import { readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { getMyRooms } from "@/lib/api/rooms";
import { useGuest } from "@/hooks/use-arena-session";

const FILTERS = [
  { id: "nearby", label: "Nearby" },
  { id: "week", label: "This week" },
  { id: "all", label: "All" },
] as const;

function greeting(hour: number) {
  if (hour < 12) return { text: "Good morning,", icon: Sun };
  if (hour < 17) return { text: "Good afternoon,", icon: CloudSun };
  return { text: "Good evening,", icon: Moon };
}

type Load = { items: FeedItem[]; me: { lat?: number; lng?: number; city?: string } | null };

export function FeedScreen() {
  const guest = useGuest();
  const draftArea = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area, () => "");
  const [filter, setFilter] = useState<FeedFilter>("nearby");
  const [data, setData] = useState<Load | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hour] = useState(() => new Date().getHours());
  const [radiusKm, setRadiusKm] = useState<number>(LAUNCH_ZONE.radiusKm);

  useEffect(() => {
    if (guest === null) return;
    let cancelled = false;
    Promise.all([
      getFeedItems("for-you", 0, 30),
      guest ? Promise.resolve(null) : getMyProfile().then((p) => ({ lat: p.approxLat, lng: p.approxLng, city: p.homeCity })).catch(() => null),
    ])
      .then(([items, me]) => {
        if (cancelled) return;
        setError(null);
        setData({ items, me });
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "The feed didn't load."))
      .finally(() => !cancelled && setRefreshing(false));
    if (!guest) getMyRooms().then((rooms) => !cancelled && setUnread(rooms.filter((r) => r.unread).length)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guest, attempt]);

  const refresh = () => {
    setRefreshing(true);
    setAttempt((n) => n + 1);
  };

  const area = draftArea || data?.me?.city || LAUNCH_ZONE.name;
  const origin = useMemo(() => originFor(data?.me, draftArea), [data?.me, draftArea]);
  const { text: hello, icon: TimeIcon } = greeting(hour);
  const shown = useMemo(() => (data ? filterFeed(data.items.filter((i) => !["closed", "cancelled", "expired"].includes(i.status)), filter, origin, radiusKm) : []), [data, filter, origin, radiusKm]);
  // Board order: one hero activity (a photo if any), then two needs side by side, then the rest.
  const upcoming = (i: FeedItem) => (i.startsAt ? Date.parse(i.startsAt) : Infinity);
  const activities = shown.filter((i) => i.itemType === "activity").sort((a, b) => Number(!!a.mine) - Number(!!b.mine) || Number(!b.mediaUrls.length) - Number(!a.mediaUrls.length) || upcoming(a) - upcoming(b));
  const hero = activities[0];
  const needs = shown.filter((i) => i.itemType === "ask");
  const rest = shown.filter((i) => i !== hero && i.itemType !== "ask").sort((a, b) => Number(b.itemType === "offer") - Number(a.itemType === "offer"));
  const km = (i: FeedItem) => distanceKm(origin, { lat: i.approxLat, lng: i.approxLng });

  return (
    <AppShell>
      <PullToRefresh onRefresh={refresh} refreshing={refreshing}>
        <header className="flex items-start justify-between pt-3">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-primary">{hello}</p>
            <h1 className="mt-0.5 flex items-center gap-2 font-display-serif text-[32px] font-medium leading-tight text-foreground">
              <span className="truncate">{area ? area.split(" / ")[0] : "Around you"}</span>
              <TimeIcon className="size-7 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
            </h1>
            <p className="mt-1 text-[15px] text-faint">Real people. Real things happening nearby.</p>
          </div>
          <div className="-mr-2 flex shrink-0">
            {guest === false && (
              <Link href="/rooms" aria-label={unread ? `Inbox, ${unread} unread` : "Inbox"} className="relative grid size-11 place-items-center rounded-full text-foreground hover:bg-foreground/5">
                <MessageCircle className="size-6" strokeWidth={1.75} aria-hidden />
                {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
              </Link>
            )}
            <Link href={guest ? "/auth?mode=signin" : "/notifications"} aria-label="Notifications" className="grid size-11 place-items-center rounded-full text-foreground hover:bg-foreground/5">
              <Bell className="size-6" strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </header>

        <div className="mt-5">
          <Pills label="Show" options={FILTERS} value={filter} onChange={setFilter} tone="cream" icons={{ nearby: MapPin }} />
        </div>

        <div className="mt-5">
          <AnimatePresence mode="wait" initial={false}>
            {error ? (
              <m.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={dissolve}>
                <StateCard kind="error" title="The feed didn't load" detail={error} action={<Button variant="outline" onClick={refresh}>Try again</Button>} />
              </m.div>
            ) : !data ? (
              <m.div key="loading" exit={{ opacity: 0 }} transition={dissolve} className="space-y-3" aria-busy="true" aria-label="Loading the feed">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-36" />
                  <Skeleton className="h-36" />
                </div>
                <Skeleton className="h-28 w-full" />
              </m.div>
            ) : shown.length === 0 ? (
              <m.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={dissolve}>
                <StateCard
                  kind="empty"
                  title={filter === "nearby" ? `Nothing within ${radiusKm} km yet` : filter === "week" ? "Nothing on this week yet" : "Nothing here yet"}
                  detail={filter === "nearby" ? "Arena is new here. Start something and neighbours will find it, or look a little further." : "When someone posts a need, an activity or an offer, it shows up here."}
                  action={
                    <div className="space-y-2">
                      <ButtonLink href="/activities/new">Create an activity</ButtonLink>
                      {filter === "nearby" && radiusKm < 15 ? (
                        <Button variant="outline" onClick={() => setRadiusKm(15)}>Widen to 15 km</Button>
                      ) : (
                        <ButtonLink href="/discover" variant="outline">Discover</ButtonLink>
                      )}
                    </div>
                  }
                />
              </m.div>
            ) : (
              <m.div key={`list-${filter}`} initial="hidden" animate="shown" className="space-y-3">
                {filter === "nearby" && radiusKm > LAUNCH_ZONE.radiusKm && <p className="text-[14px] text-faint">Showing everything within {radiusKm} km.</p>}
                {hero && (
                  <m.div variants={rise} custom={0}>
                    <HeroActivityCard item={hero} km={km(hero)} />
                  </m.div>
                )}
                {needs.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {needs.slice(0, 2).map((item, i) => (
                      <m.div key={item.id} variants={rise} custom={1 + i}>
                        <NeedCard item={item} />
                      </m.div>
                    ))}
                  </div>
                )}
                {[...rest, ...needs.slice(2)].map((item, i) => (
                  <m.div key={item.id} variants={rise} custom={5 + i}>
                    <RowCard item={item} />
                  </m.div>
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </PullToRefresh>
    </AppShell>
  );
}

/** Feed-only pull to refresh: drag down from the very top; releases past 72px refresh. */
function PullToRefresh({ children, onRefresh, refreshing }: { children: React.ReactNode; onRefresh: () => void; refreshing: boolean }) {
  const start = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const THRESHOLD = 72;
  return (
    <div
      onTouchStart={(e) => {
        start.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
      }}
      onTouchMove={(e) => {
        if (start.current == null) return;
        setPull(Math.max(0, Math.min(110, (e.touches[0].clientY - start.current) * 0.5)));
      }}
      onTouchEnd={() => {
        if (pull >= THRESHOLD) onRefresh();
        start.current = null;
        setPull(0);
      }}
    >
      <div aria-live="polite" className="flex justify-center overflow-hidden transition-[height] duration-200" style={{ height: refreshing ? 40 : pull * 0.6 }}>
        {(refreshing || pull > 8) && (
          <LoaderCircle className={refreshing ? "mt-2 size-6 animate-spin text-primary" : "mt-2 size-6 text-primary"} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} aria-label={refreshing ? "Refreshing" : undefined} />
        )}
      </div>
      {children}
    </div>
  );
}
