"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocateFixed, MapPin, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { getMyProfile } from "@/lib/api/profile";
import { getNearby, requestJoin } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { formatFriendlyDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Post, PostIntentType } from "@/lib/types";

// ssr:false - WebGL has no server-side equivalent, same next/dynamic pattern as every other R3F
// scene in this codebase (OrbScene, HealthOrbScene).
const MapRadarScene = dynamic(() => import("@/components/map/MapRadarScene").then((m) => m.MapRadarScene), {
  ssr: false,
  loading: () => <OrbLoader className="h-full" />,
});

const RADIUS_OPTIONS = [2, 5, 10, 25];
const TIME_OPTIONS: { key: string; label: string; hours?: number }[] = [
  { key: "any", label: "Any time" },
  { key: "3h", label: "Next 3h", hours: 3 },
  { key: "today", label: "Today", hours: 24 },
  { key: "week", label: "This week", hours: 168 },
];
const TYPE_OPTIONS: { key: string; label: string; type?: PostIntentType }[] = [
  { key: "all", label: "All" },
  { key: "activity", label: "Activities", type: "activity" },
  { key: "ask", label: "Asks", type: "ask" },
];

export default function MapPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [timeKey, setTimeKey] = useState("any");
  const [typeKey, setTypeKey] = useState("all");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then((p) => {
      setProfile(p);
      if (p.locationConsent && p.locationConsent !== "off" && p.approxLat != null && p.approxLng != null) {
        setCenter({ lat: p.approxLat, lng: p.approxLng });
      }
    });
  }, [router]);

  useEffect(() => {
    if (!center) return;
    const timeOpt = TIME_OPTIONS.find((t) => t.key === timeKey);
    const typeOpt = TYPE_OPTIONS.find((t) => t.key === typeKey);
    getNearby({ lat: center.lat, lng: center.lng, radiusKm, withinHours: timeOpt?.hours, intentType: typeOpt?.type }).then(setPosts);
  }, [center, radiusKm, timeKey, typeKey]);

  const selected = useMemo(() => posts?.find((p) => p.id === selectedId) ?? null, [posts, selectedId]);

  // Ad hoc, session-only - never persisted to the profile (that's Settings' job). Satisfies §5's
  // "the app must remain usable at 'off'": a candidate with location off can still use Map for
  // this one visit without changing their standing consent.
  const useMyLocationOnce = () => {
    if (!navigator.geolocation) { setLocateError("Location isn't available in this browser."); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocateError("Couldn't get your location - check permissions and try again."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const join = async (post: Post) => {
    setJoining(true);
    try {
      await requestJoin(post.id);
      if (center) getNearby({ lat: center.lat, lng: center.lng, radiusKm, withinHours: TIME_OPTIONS.find((t) => t.key === timeKey)?.hours, intentType: TYPE_OPTIONS.find((t) => t.key === typeKey)?.type }).then(setPosts);
    } finally {
      setJoining(false);
    }
  };

  if (!profile) {
    return (
      <AppShell title="Map">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Map" profile={profile}>
      {!center && (
        <>
          <EmptyState
            title="See what's nearby"
            description="Turn on location in Settings to browse activities on the map every time, or use it just for this visit below."
            className="py-16"
          />
          <div className="mx-auto mt-4 flex max-w-sm flex-col items-center gap-2.5">
            <Button variant="default" size="sm" className="gap-1.5" disabled={locating} onClick={useMyLocationOnce}>
              <LocateFixed className="size-3.5" /> {locating ? "Locating…" : "Use my location for this visit"}
            </Button>
            <Link href="/settings" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              Or turn on location permanently in Settings
            </Link>
            {locateError && <p className="text-xs text-red-400">{locateError}</p>}
          </div>
        </>
      )}

      {center && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Within:</span>
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    radiusKm === r ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeKey(t.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    timeKey === t.key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeKey(t.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                    typeKey === t.key ? "border-primary/60 bg-primary/10 text-primary-soft" : "border-border bg-secondary text-muted-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="glass-panel overflow-hidden rounded-[24px] border border-border bg-secondary" style={{ height: "min(480px, 60vh)" }}>
              {posts === null ? (
                <OrbLoader className="h-full" />
              ) : (
                <MapRadarScene
                  posts={posts}
                  centerLat={center.lat}
                  centerLng={center.lng}
                  radiusKm={radiusKm}
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id || null)}
                  reducedMotion={reducedMotion}
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              {selected && (
                <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
                  <div className="flex items-start gap-2.5">
                    <PersonAvatar seed={selected.authorUserId} name={selected.authorName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{selected.authorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {selected.distanceKm != null && `${selected.distanceKm.toFixed(1)} km away`}
                        {selected.startsAt && ` · ${formatFriendlyDateTime(selected.startsAt)}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs text-foreground/90">{selected.body}</p>
                  <div className="mt-3 flex gap-2">
                    {selected.myJoinStatus ? (
                      <p className="text-xs text-muted-foreground">
                        {selected.myJoinStatus === "approved" ? "You're in" : selected.myJoinStatus === "pending" ? "Request pending" : "Request declined"}
                      </p>
                    ) : (
                      <Button variant="default" size="sm" className="gap-1.5" disabled={joining} onClick={() => join(selected)}>
                        <Sparkles className="size-3.5" /> {joining ? "Requesting…" : selected.visibility === "public" ? "Join" : "Request to join"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => router.push(`/feed/${selected.id}`)}>View post</Button>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: selected ? "min(340px, 40vh)" : "min(480px, 60vh)" }}>
                {posts === null ? null : posts.length === 0 ? (
                  <EmptyState title="Nothing nearby right now" description="Try a wider radius or a different time window." className="py-10" />
                ) : (
                  posts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors",
                        p.id === selectedId ? "border-primary/50 bg-primary/[0.06]" : "border-border bg-secondary hover:border-white/20",
                      )}
                    >
                      <PersonAvatar seed={p.authorUserId} name={p.authorName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{p.authorName}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{p.body}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant="secondary" className="gap-1 bg-secondary text-[10px] text-muted-foreground">
                          <MapPin className="size-2.5" /> {p.distanceKm != null ? `${p.distanceKm.toFixed(1)}km` : ""}
                        </Badge>
                        {p.capacity && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Users className="size-2.5" /> {p.spotsFilled}/{p.capacity}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
