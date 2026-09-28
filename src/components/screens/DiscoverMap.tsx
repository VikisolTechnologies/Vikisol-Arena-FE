"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, m } from "motion/react";
import { Info, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { press, spring, staggerDelay } from "@/lib/motion";
import { ButtonLink } from "@/components/bplus/Button";
import { Pills, Skeleton, StateCard } from "@/components/bplus/Primitives";
import { googleMapsConfigured } from "@/components/map/GoogleMapView";
import { getNearby, whenLabel, type Post } from "@/lib/data/feed";
import { getMyProfile } from "@/lib/data/profile";
import { readEntryDraft, subscribeEntryDraft } from "@/lib/data/onboarding";
import { Cover } from "@/components/covers/Cover";

const GoogleMapView = dynamic(() => import("@/components/map/GoogleMapView").then((mod) => mod.GoogleMapView), { ssr: false });

/** Launch zone centre (Gachibowli / Gopanapally) — used until we know the person's approximate area. */
const LAUNCH = { lat: 17.4401, lng: 78.3489 };
const RADIUS_KM = 6;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "activity", label: "Activities" },
  { id: "ask", label: "Needs" },
  { id: "offer", label: "Offers" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const PIN: Record<string, string> = { activity: "bg-info", ask: "bg-primary", offer: "bg-success" };

export function DiscoverMap() {
  const [center, setCenter] = useState<{ lat: number; lng: number; approximate: boolean } | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const area = useSyncExternalStore(subscribeEntryDraft, () => readEntryDraft().area, () => "");

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => (p.approxLat != null && p.approxLng != null ? { lat: p.approxLat, lng: p.approxLng, approximate: true } : { ...LAUNCH, approximate: false }))
      .catch(() => ({ ...LAUNCH, approximate: false }))
      .then((c) => {
        if (cancelled) return;
        setCenter(c);
        return getNearby({ lat: c.lat, lng: c.lng, radiusKm: RADIUS_KM }).then((p) => !cancelled && setPosts(p));
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : "Nearby didn't load."));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => (posts ?? []).filter((p) => filter === "all" || p.intentType === filter), [posts, filter]);
  const pick = shown.find((p) => p.id === selected) ?? null;

  return (
    <div className="mt-5">
      <div className="flex h-12 items-center gap-3 rounded-button border border-field-line bg-surface px-4 text-[15px]">
        <MapPin className="size-5 text-faint" strokeWidth={1.75} aria-hidden />
        <span className="truncate">{area || (center?.approximate ? "Your area" : "Gachibowli / Gopanapally")}</span>
      </div>
      <div className="mt-4">
        <Pills label="Show on map" options={FILTERS} value={filter} onChange={(f) => { setFilter(f); setSelected(null); }} />
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[var(--radius-card)] border border-line">
        {!center || (!posts && !error) ? (
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
        ) : error ? (
          <div className="p-4"><StateCard kind="error" title="Nearby didn't load" detail={error} /></div>
        ) : googleMapsConfigured() ? (
          <div className="aspect-[3/4] w-full">
            <GoogleMapView posts={shown} centerLat={center.lat} centerLng={center.lng} radiusKm={RADIUS_KM} selectedId={selected} onSelect={setSelected} />
          </div>
        ) : (
          <DrawnMap center={center} you={center.approximate} posts={shown} selected={selected} onSelect={setSelected} />
        )}
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
      {posts && shown.length === 0 && !error && (
        <p className="mt-3 text-center text-[14px] text-faint">Nothing posted within {RADIUS_KM} km yet.</p>
      )}
      {shown.length > 0 && !pick && <p className="mt-3 text-center text-[14px] text-faint">Tap a pin to see what&apos;s there.</p>}
      <p className="sr-only" aria-live="polite">{shown.length} places on the map.</p>
      <ul className="sr-only">
        {shown.map((p) => (
          <li key={p.id}><Link href={`/feed/${p.id}`}>{p.title || p.body.slice(0, 60)}</Link></li>
        ))}
      </ul>
    </div>
  );
}

/** A light, drawn map (no tiles, no 3D): real approximate pins placed relative to the centre. */
function DrawnMap({ center, you, posts, selected, onSelect }: { center: { lat: number; lng: number }; you: boolean; posts: Post[]; selected: string | null; onSelect: (id: string) => void }) {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((center.lat * Math.PI) / 180);
  const place = (p: Post) => {
    if (p.approxLat == null || p.approxLng == null) return null;
    const x = ((p.approxLng - center.lng) * kmPerDegLng) / RADIUS_KM;
    const y = ((p.approxLat - center.lat) * kmPerDegLat) / RADIUS_KM;
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
        {you ? "You" : "Gachibowli"}
        <br />
        <span className="text-faint">{you ? "(approximate)" : "(launch area)"}</span>
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
