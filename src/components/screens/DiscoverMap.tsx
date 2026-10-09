"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { CalendarDays, Info, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring, staggerDelay } from "@/lib/motion";
import { ButtonLink } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM, distanceKm, getNearby, whenLabel, type Post } from "@/lib/data/feed";
import { getMyProfile } from "@/lib/data/profile";
import { PlacePrompt } from "@/components/location/PlacePrompt";
import { readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { Cover } from "@/components/covers/Cover";
import { KindLabel } from "@/components/arena/FeedCard";

// Live map (MapLibre GL + OpenFreeMap, no key). If WebGL or the tiles fail, the static
// launch-zone image below takes over, then the drawn map outside it.
// MapLibre loads only here, on demand; the placeholder keeps the map's box so nothing below it
// moves when it arrives (performance pass: map CLS was 0.2).
const ArenaMap = dynamic(() => import("@/components/map/ArenaMap").then((mod) => mod.ArenaMap), { ssr: false, loading: () => <Skeleton className="aspect-[3/4] w-full rounded-none" /> });

/** The ring around "You": how approximate the shown position is (~1.5 km), not an exact point. */
const APPROX_RING_KM = 1.5;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "activity", label: "Activities" },
  { id: "ask", label: "Needs" },
  { id: "offer", label: "Offers" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const PIN: Record<string, string> = { activity: "bg-info", ask: "bg-primary", offer: "bg-success" };

/** Fallback only: a static dark basemap of the launch zone, rendered once from OpenStreetMap tiles
 *  (© OSM contributors, ODbL), shown when the live map can't load. Web Mercator bounds of public/map/launch-zone.webp (12 × 16 km). */
const BASEMAP = { src: "/map/launch-zone.webp", north: 17.512172, south: 17.368028, west: 78.292241, east: 78.405559 };
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
function onBasemap(lat: number, lng: number) {
  const x = (lng - BASEMAP.west) / (BASEMAP.east - BASEMAP.west);
  const y = (mercY(BASEMAP.north) - mercY(lat)) / (mercY(BASEMAP.north) - mercY(BASEMAP.south));
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}

export function DiscoverMap() {
  const [center, setCenter] = useState<{ lat: number; lng: number; approximate: boolean } | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const area = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area, () => "");

  useEffect(() => {
    const bump = () => setReload((n) => n + 1);
    window.addEventListener("arena-location", bump);
    return () => window.removeEventListener("arena-location", bump);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => (p.approxLat != null && p.approxLng != null ? { lat: p.approxLat, lng: p.approxLng, approximate: true as const } : null))
      .catch(() => null)
      .then((c) => {
        if (cancelled) return;
        setCenter(c);
        if (!c) {
          setPosts([]);
          return;
        }
        return getNearby({ lat: c.lat, lng: c.lng, radiusKm }).then((p) => !cancelled && setPosts(p));
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Nearby didn't load."));
    return () => {
      cancelled = true;
    };
  }, [reload, radiusKm]);

  const shown = useMemo(() => (posts ?? []).filter((p) => {
    if (filter !== "all" && p.intentType !== filter) return false;
    if (!center || p.approxLat == null || p.approxLng == null) return false;
    const km = distanceKm(center, { lat: p.approxLat, lng: p.approxLng });
    return km != null && km <= radiusKm;
  }), [posts, filter, center, radiusKm]);
  // Board: the nearest upcoming thing is previewed until a pin is tapped.
  const nearest = useMemo(() => {
    if (!center) return null;
    const d = (p: Post) => (p.approxLat == null || p.approxLng == null ? Infinity : (p.approxLat - center.lat) ** 2 + (p.approxLng - center.lng) ** 2);
    const placed = [...shown].filter((p) => p.approxLat != null).sort((a, b) => d(a) - d(b));
    return placed.find((p) => p.intentType === "activity") ?? placed[0] ?? null;
  }, [shown, center]);
  const pick = shown.find((p) => p.id === selected) ?? nearest;

  return (
    <div className="mt-5">
      <div className="flex h-12 items-center gap-3 rounded-button border border-field-line bg-surface px-4 text-[15px]">
        <MapPin className="size-5 text-faint" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{area || "Your area"}</span>
      </div>
      <div className="mt-4">
        <Pills label="Show on map" options={FILTERS} value={filter} onChange={(f) => { setFilter(f); setSelected(null); }} />
      </div>
      <label className="mt-4 block">
        <span className="flex items-center justify-between text-[14px] font-medium">
          <span>Distance</span>
          <span>{radiusKm} km</span>
        </span>
        <input
          type="range"
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          step={1}
          value={radiusKm}
          aria-label="Distance"
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          className="mt-2 h-11 w-full accent-primary"
        />
      </label>

      <div className="relative mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line" data-radius-km={radiusKm}>
        {posts === null && !error ? (
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
        ) : !center ? (
          <div className="p-4">
            <PlacePrompt onSaved={() => { setPosts(null); setReload((n) => n + 1); }} />
            <p className="mt-3 text-center text-[13px] text-faint">Approximate location for your privacy</p>
          </div>
        ) : error ? (
          <div className="p-4"><StateCard kind="error" title="Nearby didn't load" detail={error} /></div>
        ) : !tilesFailed ? (
          <ArenaMap center={center} you={center.approximate} ringKm={radiusKm} posts={shown} selected={pick?.id ?? null} onSelect={setSelected} onFail={() => setTilesFailed(true)} />
        ) : onBasemap(center.lat, center.lng) ? (
          <TileMap center={center} you={center.approximate} posts={shown} selected={pick?.id ?? null} onSelect={setSelected} />
        ) : (
          <DrawnMap center={center} radiusKm={radiusKm} posts={shown} selected={selected} onSelect={setSelected} />
        )}
        {center && (
          <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1.5 text-[14px] font-semibold text-foreground backdrop-blur" aria-hidden>
            {radiusKm} km
          </p>
        )}
        {center && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end gap-2">
            <p className="pointer-events-auto flex flex-1 items-center gap-2 rounded-xl bg-background/85 px-3 py-2 text-[12px] leading-tight text-foreground backdrop-blur">
              <MapPin className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <span>
                Looking in this area
                <br />
                <span className="text-faint">Approximate location for your privacy</span>
              </span>
              <Info className="ml-auto size-4 shrink-0 text-faint" strokeWidth={1.75} aria-hidden />
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pick && (
          <m.article
            key={pick.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: spring.gentle }}
            exit={{ y: 24, opacity: 0 }}
            className="mt-3 flex gap-3 rounded-tile bg-paper p-3 text-paper-ink"
          >
            <Cover source={{ id: pick.id, kind: pick.intentType, media: pick.mediaUrls[0], tags: pick.tags, title: pick.title, body: pick.body, startsAt: pick.startsAt }} className="size-24 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[16px] font-semibold">{pick.title || pick.body.slice(0, 60)}</h3>
              <p className="mt-0.5 text-[13px] text-paper-ink-muted">{[whenLabel(pick.startsAt), pick.locationText].filter(Boolean).join(" · ")}</p>
              <ButtonLink href={`/feed/${pick.id}`} className="mt-2 h-11 w-auto px-5">{pick.intentType === "activity" ? "Join" : "View"}</ButtonLink>
            </div>
          </m.article>
        )}
      </AnimatePresence>
      {posts && center && shown.length === 0 && !error && (
        <p className="mt-3 text-center text-[14px] text-faint">Nothing posted within {radiusKm} km yet.</p>
      )}
      {shown.length > 0 && (
        <div className="mt-5 flex items-baseline justify-between">
          <h2 className="text-[18px] font-semibold">Nearby ({radiusKm} km)</h2>
          <p className="text-[13px] text-faint">Tap a pin to see what&apos;s there.</p>
        </div>
      )}
      <ul className="mt-3 space-y-2.5" aria-label="Places in this distance" aria-live="polite">
        {shown.map((p) => {
          const km = center ? distanceKm(center, { lat: p.approxLat, lng: p.approxLng }) : null;
          const when = whenLabel(p.startsAt);
          return (
            <li key={p.id}>
              <Link href={`/feed/${p.id}`} className="flex gap-3 rounded-tile bg-paper p-3 text-paper-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <Cover source={{ id: p.id, kind: p.intentType, media: p.mediaUrls[0], tags: p.tags, title: p.title, body: p.body, startsAt: p.startsAt }} className="size-[88px] shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <KindLabel kind={p.intentType} small />
                  <span className="mt-1 block truncate text-[16px] font-semibold">{p.title || p.body.slice(0, 60)}</span>
                  {when && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-paper-ink-muted">
                      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                      {when}
                    </span>
                  )}
                  <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-paper-ink-muted">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{[p.locationText, km != null ? `${Math.round(km * 10) / 10} km` : null].filter(Boolean).join(" · ") || "Nearby"}</span>
                  </span>
                  {p.spotsFilled ? (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-paper-ink-muted">
                      <Users className="size-3.5 shrink-0" aria-hidden />
                      {p.spotsFilled} going
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A light, drawn map (no tiles, no 3D): real approximate pins placed relative to the centre. */
function DrawnMap({ center, radiusKm, posts, selected, onSelect }: { center: { lat: number; lng: number }; radiusKm: number; posts: Post[]; selected: string | null; onSelect: (id: string) => void }) {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((center.lat * Math.PI) / 180);
  const place = (p: Post) => {
    if (p.approxLat == null || p.approxLng == null) return null;
    const x = ((p.approxLng - center.lng) * kmPerDegLng) / radiusKm;
    const y = ((p.approxLat - center.lat) * kmPerDegLat) / radiusKm;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return null;
    return { left: `${50 + x * 44}%`, top: `${50 - y * 44}%` };
  };
  return (
    <div className="relative aspect-[3/4] w-full bg-surface">
      <svg aria-hidden viewBox="0 0 300 400" preserveAspectRatio="none" className="absolute inset-0 size-full text-line" fill="none" stroke="currentColor">
        {[40, 95, 150, 210, 265, 330, 370].map((y, i) => <path key={`h${i}`} d={`M0 ${y + (i % 2) * 6} C 90 ${y - 14}, 200 ${y + 16}, 300 ${y - 4}`} strokeWidth={i % 3 === 0 ? 2.5 : 1} />)}
        {[30, 85, 140, 205, 260].map((x, i) => <path key={`v${i}`} d={`M${x} 0 C ${x + 12} 120, ${x - 10} 260, ${x + 8} 400`} strokeWidth={i % 2 === 0 ? 2 : 1} />)}
        <ellipse cx="228" cy="300" rx="52" ry="30" className="fill-info/15 stroke-info/30" />
      </svg>
      <div aria-hidden className="absolute left-1/2 top-1/2 grid aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-info/15 ring-1 ring-info/30">
        <span className="size-4 rounded-full bg-info ring-4 ring-background" />
      </div>
      <p aria-hidden className="absolute left-1/2 top-1/2 mt-5 -translate-x-1/2 text-center text-[12px] font-medium leading-tight text-foreground">
        You
        <br />
        <span className="text-faint">(approximate)</span>
      </p>
      {posts.map((p, i) => {
        const at = place(p);
        if (!at) return null;
        return (
          <m.button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-label={p.title || "Open this place"}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { ...spring.snappy, delay: staggerDelay(i) } }}
            whileTap={press}
            className={cn("absolute grid size-11 -translate-x-1/2 -translate-y-full place-items-center outline-none focus-visible:outline-2 focus-visible:outline-primary")}
            style={at}
          >
            <span className={cn("grid size-8 place-items-center rounded-full rounded-br-none rotate-45 shadow-lg ring-2", PIN[p.intentType] ?? "bg-warning", selected === p.id ? "ring-foreground" : "ring-background")}>
              <span className="size-2.5 -rotate-45 rounded-full bg-white" />
            </span>
          </m.button>
        );
      })}
    </div>
  );
}

/** The launch-zone basemap with real approximate pins (Web Mercator), "You" and the 5 km ring. */
function TileMap({ center, posts, selected, onSelect }: { center: { lat: number; lng: number }; you?: boolean; posts: Post[]; selected: string | null; onSelect: (id: string) => void }) {
  const me = onBasemap(center.lat, center.lng)!;
  const ringW = (2 * APPROX_RING_KM) / 12; // fraction of the 12 km-wide basemap
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#161e1c]">
      {/* Zoomed 1.6× around the launch-zone centre: the box shows about 7.5 × 10 km. */}
      <div className="absolute inset-[-30%]">
      {/* eslint-disable-next-line @next/next/no-img-element -- a local static basemap sized to its box */}
      <img src={BASEMAP.src} alt="" className="absolute inset-0 size-full object-cover" decoding="async" />
      <div aria-hidden className="absolute grid aspect-square -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-info/20 ring-1 ring-info/40" style={{ left: `${me.x * 100}%`, top: `${me.y * 100}%`, width: `${ringW * 100}%` }}>
        <span className="size-4 rounded-full bg-info ring-4 ring-white/80" />
      </div>
      <p aria-hidden className="absolute mt-5 -translate-x-1/2 text-center text-[12px] font-medium leading-tight text-white" style={{ left: `${me.x * 100}%`, top: `${me.y * 100}%` }}>
        You
        <br />
        <span className="text-white/70">(approximate)</span>
      </p>
      {posts.map((p, i) => {
        if (p.approxLat == null || p.approxLng == null) return null;
        const at = onBasemap(p.approxLat, p.approxLng);
        if (!at) return null;
        return (
          <m.button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-label={p.title || "Open this place"}
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { ...spring.snappy, delay: staggerDelay(i) } }}
            whileTap={press}
            className="absolute grid size-11 -translate-x-1/2 -translate-y-full place-items-center outline-none focus-visible:outline-2 focus-visible:outline-primary"
            style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          >
            <span className={cn("grid size-8 rotate-45 place-items-center rounded-full rounded-br-none shadow-lg ring-2", PIN[p.intentType] ?? "bg-warning", selected === p.id ? "scale-110 ring-white" : "ring-black/30")}>
              <span className="size-2.5 -rotate-45 rounded-full bg-white" />
            </span>
          </m.button>
        );
      })}
      </div>
      <p className="absolute right-1.5 top-1.5 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">© OpenStreetMap contributors</p>
    </div>
  );
}
