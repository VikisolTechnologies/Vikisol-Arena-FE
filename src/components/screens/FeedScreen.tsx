"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, CalendarDays, CloudSun, LoaderCircle, MapPin, MessageCircle, Moon, SlidersHorizontal, Sun } from "lucide-react";
import { ArenaShell } from "@/components/arena/ArenaShell";
import { FeedCard } from "@/components/arena/FeedCard";
import { Button, ButtonLink } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { cn } from "@/lib/utils";
import { DEFAULT_RADIUS_KM, distanceKm, filterFeed, formatKm, getFeedItems, hrefFor, originFor, whenLabel, type FeedFilter, type FeedItem } from "@/lib/data/feed";
import { PlacePrompt } from "@/components/location/PlacePrompt";
import { getMyProfile } from "@/lib/data/profile";
import { EMPTY_DRAFT, readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { JENNY_PREVIEW } from "@/lib/data/jenny";
import { getMyRooms } from "@/lib/api/rooms";
import { useGuest } from "@/hooks/use-arena-session";
import type { Room } from "@/lib/types";

/** What kind of post (founder mockup): the main filter row. */
const KINDS = [
  { id: "all", label: "All" },
  { id: "activity", label: "Activities" },
  { id: "job", label: "Jobs" },
  { id: "ask", label: "Needs" },
  { id: "offer", label: "Offers" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

/** Where and when: behind the filter button on the location bar. */
const RANGES = [
  { id: "all", label: "Anywhere" },
  { id: "nearby", label: "Nearby" },
  { id: "week", label: "This week" },
] as const;

// Preview-only (P8): its code loads only where it can render.
const JennyNoticedCard = dynamic(() => import("@/components/jenny/JennyNoticedCard").then((m) => m.JennyNoticedCard), { ssr: false });

function greeting(hour: number) {
  if (hour < 12) return { text: "Good morning,", icon: Sun };
  if (hour < 17) return { text: "Good afternoon,", icon: CloudSun };
  return { text: "Good evening,", icon: Moon };
}

type Load = { items: FeedItem[]; me: { lat?: number; lng?: number; city?: string } | null };

// The feed request starts when this screen's code arrives, not after hydration and the session
// check. Used once.
let earlyFeed: Promise<FeedItem[]> | null = typeof window !== "undefined" ? getFeedItems("for-you", 0, 30) : null;
earlyFeed?.catch(() => {});
function feedRequest() {
  const early = earlyFeed;
  earlyFeed = null;
  return early ?? getFeedItems("for-you", 0, 30);
}

function RailCard({ title, href, link, children }: { title: string; href?: string; link?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-paper p-4 text-paper-ink shadow-[0_1px_2px_rgba(30,23,20,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-primary-on-paper outline-none hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            {link} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function FeedScreen() {
  const guest = useGuest();
  const draftArea = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area, () => "");
  const entry = useSyncExternalStore(subscribeEntryDraft, readEntryDraft, () => EMPTY_DRAFT);
  const [kind, setKind] = useState<Kind>("all");
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [data, setData] = useState<Load | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [hour] = useState(() => new Date().getHours());
  const [now] = useState(() => Date.now());
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);

  useEffect(() => {
    const bump = () => setAttempt((n) => n + 1);
    window.addEventListener("arena-location", bump);
    return () => window.removeEventListener("arena-location", bump);
  }, []);

  useEffect(() => {
    if (guest === null) return;
    let cancelled = false;
    Promise.all([
      feedRequest(),
      guest ? Promise.resolve(null) : getMyProfile().then((p) => ({ lat: p.approxLat, lng: p.approxLng, city: p.homeCity })).catch(() => null),
    ])
      .then(([items, me]) => {
        if (cancelled) return;
        setError(null);
        setData({ items, me });
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "The feed didn't load."))
      .finally(() => !cancelled && setRefreshing(false));
    if (!guest) getMyRooms().then((r) => !cancelled && setRooms(r)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guest, attempt]);

  const refresh = () => {
    setRefreshing(true);
    setAttempt((n) => n + 1);
  };

  const area = draftArea || data?.me?.city || "";
  const origin = useMemo(() => originFor(data?.me, draftArea), [data?.me, draftArea]);
  const { text: hello, icon: TimeIcon } = greeting(hour);
  const open = useMemo(() => (data ? data.items.filter((i) => !["closed", "cancelled", "expired"].includes(i.status)) : []), [data]);
  const shown = useMemo(() => filterFeed(open, filter, origin, radiusKm).filter((i) => kind === "all" || i.itemType === kind), [open, filter, origin, radiusKm, kind]);
  const km = (i: FeedItem) => distanceKm(origin, { lat: i.approxLat, lng: i.approxLng });
  const rangeLabel = RANGES.find((r) => r.id === filter)?.label ?? "Anywhere";

  // Right rail (desktop), from the same real data: what is coming up, and your chats.
  const upcoming = useMemo(
    () => open.filter((i) => i.itemType === "activity" && i.startsAt && Date.parse(i.startsAt) > now).sort((a, b) => Date.parse(a.startsAt as string) - Date.parse(b.startsAt as string)).slice(0, 3),
    [open, now],
  );
  const nearbyCount = useMemo(() => (origin ? filterFeed(open, "nearby", origin, DEFAULT_RADIUS_KM).length : null), [open, origin]);
  const chats = useMemo(() => [...rooms].sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)).slice(0, 4), [rooms]);

  const aside = (
    <>
      <RailCard title="Nearby on Map" href="/map" link="View map">
        <Link href="/map" className="flex items-center gap-3 rounded-2xl bg-paper-muted p-3 outline-none hover:bg-paper-ink/8 focus-visible:outline-2 focus-visible:outline-primary">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white">
            <MapPin className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span className="text-[14px] leading-snug">
            {nearbyCount == null ? "Share your area to see what is close to you." : nearbyCount === 0 ? `No posts close to you yet.` : `${nearbyCount} ${nearbyCount === 1 ? "thing" : "things"} within ${DEFAULT_RADIUS_KM} km of you.`}
          </span>
        </Link>
      </RailCard>
      {upcoming.length > 0 && (
        <RailCard title="Upcoming near you">
          <ul className="space-y-3">
            {upcoming.map((i) => {
              const d = new Date(i.startsAt as string);
              const dist = km(i);
              return (
                <li key={i.id}>
                  <Link href={hrefFor(i)} className="flex items-center gap-3 rounded-xl outline-none hover:bg-paper-ink/5 focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="grid w-11 shrink-0 text-center leading-tight">
                      <span className="text-[11px] font-bold uppercase text-primary-on-paper">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                      <span className="text-[19px] font-bold">{d.getDate()}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{i.title?.trim() || i.body.slice(0, 60)}</span>
                      <span className="block truncate text-[13px] text-paper-ink-muted">{[whenLabel(i.startsAt), dist != null ? formatKm(dist) : null, i.spotsFilled ? `${i.spotsFilled} going` : null].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </RailCard>
      )}
      {guest === false && (
        <RailCard title="Chats" href="/rooms" link="See all">
          {chats.length === 0 ? (
            <p className="text-[14px] text-paper-ink-muted">No chats yet. Join something and its chat appears here.</p>
          ) : (
            <ul className="space-y-1">
              {chats.map((r) => (
                <li key={r.id}>
                  <Link href={`/rooms/${r.id}`} className="flex items-center gap-3 rounded-xl p-1.5 outline-none hover:bg-paper-ink/5 focus-visible:outline-2 focus-visible:outline-primary">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-muted">
                      <MessageCircle className="size-5 text-paper-ink-muted" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{r.postBody}</span>
                      <span className="block truncate text-[13px] text-paper-ink-muted">{r.lastMessagePreview || `${r.memberCount} in this chat`}</span>
                    </span>
                    {r.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </RailCard>
      )}
    </>
  );

  return (
    <ArenaShell aside={aside}>
      <PullToRefresh onRefresh={refresh} refreshing={refreshing}>
        {/* Greeting: a photo banner on desktop, one quiet line on a phone. */}
        <header className="arena-hero mb-4 hidden rounded-[20px] px-7 py-7 text-white lg:block">
          <p className="font-display-serif text-[22px] text-[#ff9a62]">{hello}</p>
          <h1 className="mt-0.5 flex items-center gap-3 font-display-serif text-[36px] font-medium leading-tight">
            {area || "Around you"}
            <TimeIcon className="size-8 text-warning" strokeWidth={1.75} aria-hidden />
          </h1>
          <p className="mt-1 text-[15px] text-white/85">Real people. Real things happening nearby.</p>
        </header>
        <h1 className="sr-only lg:hidden">Feed</h1>

        {/* Location bar with the where-and-when filter */}
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-4 pr-1">
          <MapPin className="size-5 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
          <p className="min-w-0 flex-1 truncate text-[15px] text-foreground">
            {area || "Around you"}
            {filter !== "all" && <span className="text-faint"> · {rangeLabel}{filter === "nearby" ? ` (${radiusKm} km)` : ""}</span>}
          </p>
          <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} aria-controls="feed-filters" aria-label="Filters" className={cn("grid size-11 shrink-0 place-items-center rounded-full outline-none hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-primary", (filtersOpen || filter !== "all") && "text-primary")}>
            <SlidersHorizontal className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {filtersOpen && (
          <div id="feed-filters" className="mt-3">
            <Pills label="Where and when" options={RANGES} value={filter} onChange={setFilter} tone="cream" icons={{ nearby: MapPin, week: CalendarDays }} />
          </div>
        )}

        <div className="arena-scroll-x -mx-4 mt-3 px-4 lg:mx-0 lg:px-0">
          <div className="w-max">
            <Pills label="Show" options={KINDS} value={kind} onChange={setKind} />
          </div>
        </div>

        {JENNY_PREVIEW && guest === false && data && (
          <div className="mt-4">
            <JennyNoticedCard items={data.items} me={{ interests: entry.interests, availability: entry.availability, origin }} />
          </div>
        )}

        <div className="mt-4">
          {error ? (
            <StateCard kind="error" title="The feed didn't load" detail={error} action={<Button variant="outline" onClick={refresh}>Try again</Button>} />
          ) : !data ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading the feed">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          ) : filter === "nearby" && !origin ? (
            <PlacePrompt onSaved={refresh} />
          ) : shown.length === 0 ? (
            <StateCard
              kind="empty"
              title={filter === "nearby" ? `Nothing within ${radiusKm} km yet` : filter === "week" ? "Nothing on this week yet" : kind === "all" ? "Nothing here yet" : `No ${KINDS.find((k) => k.id === kind)?.label.toLowerCase()} yet`}
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
          ) : (
            <div className="space-y-4">
              {filter === "nearby" && radiusKm > DEFAULT_RADIUS_KM && <p className="text-[14px] text-faint">Showing everything within {radiusKm} km.</p>}
              {kind === "job" && (
                <Link href="/work" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-primary-soft outline-none hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                  Your applications and saved jobs <ArrowRight className="size-4" aria-hidden />
                </Link>
              )}
              {shown.map((item, i) => (
                <FeedCard key={item.id} item={item} km={km(item)} priority={i === 0} />
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    </ArenaShell>
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
