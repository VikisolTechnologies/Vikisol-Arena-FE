"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";
import { getMyProfile, updateMyLocation } from "@/lib/api/profile";
import { getNearby, requestJoin } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { GoogleMapView, googleMapsConfigured } from "@/components/map/GoogleMapView";
import { OrbLoader } from "@/components/ui/orb-loader";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { HomeHeader } from "@/components/home-v3/HomeHeader";
import { HomeTabBar } from "@/components/home-v3/HomeTabBar";
import { ARENA_V3 } from "@/components/home-v3/tokens";
import { MapFilterChips, type MapTypeFilter } from "@/components/map-v3/MapFilterChips";
import { MapListRow } from "@/components/map-v3/MapListRow";
import { MapDetailSheet } from "@/components/map-v3/MapDetailSheet";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { HomeEmptyState } from "@/components/home-v3/HomeEmptyState";
import type { CandidateProfile, Post } from "@/lib/types";

const MapRadarScene = dynamic(() => import("@/components/map/MapRadarScene").then((m) => m.MapRadarScene), {
  ssr: false,
  loading: () => <OrbLoader className="h-full" />,
});

// ARENA-WEB-AND-SEED.md §3.5 - "The Map centres on the city with a clear 'showing all of
// Hyderabad' state... It does not show an empty ring and a dot." Real Hyderabad city center
// (same coordinates DataSeeder/DemoContentService already use for Gachibowli-area jittering),
// used the moment the map needs SOME center and the viewer hasn't granted precise location yet -
// the map always renders real content at this radius, never blocks on location first.
const HYDERABAD_CENTER = { lat: 17.385, lng: 78.4867 };

export default function MapPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [center, setCenter] = useState(HYDERABAD_CENTER);
  const [hasPreciseLocation, setHasPreciseLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [typeKey, setTypeKey] = useState<MapTypeFilter>("all");
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [composerIntent, setComposerIntent] = useState<Exclude<Post["intentType"], "company"> | null>(null);

  function openComposer() {
    setComposerIntent(null);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  function openComposerWithIntent(intent: Exclude<Post["intentType"], "company">) {
    setComposerIntent(intent);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then((p) => {
      setProfile(p);
      if (p.locationConsent && p.locationConsent !== "off" && p.approxLat != null && p.approxLng != null) {
        setCenter({ lat: p.approxLat, lng: p.approxLng });
        setHasPreciseLocation(true);
      }
    });
  }, [router]);

  useEffect(() => {
    const type = typeKey === "all" ? undefined : typeKey;
    getNearby({ lat: center.lat, lng: center.lng, radiusKm, withinHours: 168, intentType: type }).then(setPosts);
  }, [center, radiusKm, typeKey]);

  const selected = posts?.find((p) => p.id === selectedId) ?? null;

  // ARENA-WEB-AND-SEED.md §1.3/§3.3 - a real button calling the browser's own geolocation API
  // directly, not a text link elsewhere. Updates the standing profile (same call Settings'
  // "Precise" option makes) and re-centers in place - no navigation, no reload.
  function enableLocation() {
    if (!navigator.geolocation) {
      setLocationBlocked(true);
      return;
    }
    setLocating(true);
    setLocationBlocked(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const updated = await updateMyLocation({ consent: "precise", lat: pos.coords.latitude, lng: pos.coords.longitude });
          setProfile(updated);
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHasPreciseLocation(true);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setLocationBlocked(true);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  async function join(post: Post) {
    setJoining(true);
    try {
      await requestJoin(post.id);
      const type = typeKey === "all" ? undefined : typeKey;
      const fresh = await getNearby({ lat: center.lat, lng: center.lng, radiusKm, withinHours: 168, intentType: type });
      setPosts(fresh);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <HomeHeader profile={profile} onCompose={openComposer} />

      <div className="h-[300px] md:h-[380px]" style={{ position: "relative", flexShrink: 0, background: ARENA_V3.mapDark }}>
        {posts === null ? (
          <OrbLoader className="h-full" />
        ) : googleMapsConfigured() ? (
          <GoogleMapView posts={posts} centerLat={center.lat} centerLng={center.lng} radiusKm={radiusKm} selectedId={selectedId} onSelect={(id) => setSelectedId(id || null)} />
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
        <MapFilterChips typeKey={typeKey} onTypeChange={setTypeKey} radiusKm={radiusKm} onRadiusChange={setRadiusKm} />
        {!hasPreciseLocation && (
          <div style={{ position: "absolute", bottom: 14, left: 14, right: 14, display: "flex", justifyContent: "center", zIndex: 5 }}>
            <button
              type="button"
              onClick={enableLocation}
              disabled={locating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                background: ARENA_V3.ivory,
                color: ARENA_V3.ink,
                border: "none",
                borderRadius: 20,
                padding: "9px 16px",
                cursor: locating ? "default" : "pointer",
                opacity: locating ? 0.7 : 1,
              }}
            >
              <LocateFixed size={13} strokeWidth={1.75} />
              {locating ? "Locating…" : "Showing Hyderabad · use my location"}
            </button>
          </div>
        )}
        {locationBlocked && (
          <p style={{ position: "absolute", bottom: -22, left: 14, right: 14, margin: 0, fontSize: 11, color: ARENA_V3.muted }}>
            Location is blocked for this site - check your browser&apos;s site settings to turn it back on.
          </p>
        )}
      </div>

      {/* ARENA-MOCKUP-REFERENCE.md SCREEN 2 - "Bottom sheet... pulled up 20px over the map." A
          negative margin over a rounded-top panel, not a floating/draggable overlay - matches
          the mockup's own literal markup, not an invented gesture interaction. */}
      <div className="md:pb-6" style={{ flex: 1, background: ARENA_V3.ivory, borderRadius: "20px 20px 0 0", marginTop: -20, position: "relative", paddingTop: 16, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div style={{ width: 32, height: 3, background: ARENA_V3.hairline, borderRadius: 3, margin: "0 auto 16px" }} />
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 14px" }}>
          {selected ? (
            <MapDetailSheet
              post={selected}
              joining={joining}
              onJoin={() => join(selected)}
              onViewPost={() => router.push(`/feed/${selected.id}`)}
            />
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 10, color: ARENA_V3.muted, letterSpacing: 3 }}>
                {posts === null ? "LOADING" : `${posts.length} NEARBY`}
              </p>
              {posts !== null && posts.length === 0 && (
                <HomeEmptyState
                  headline="Nothing nearby right now"
                  description="Widen your radius, or be the first to start something at this distance."
                  primaryActionLabel="Start something"
                  onPrimaryAction={openComposer}
                  onStartIntent={openComposerWithIntent}
                />
              )}
              {posts?.map((p) => (
                <MapListRow key={p.id} post={p} active={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
              ))}
            </>
          )}
        </div>
      </div>

      <HomeTabBar onCompose={openComposer} />

      <CreateComposer key={composerSession} open={composerOpen} onOpenChange={setComposerOpen} onPublished={() => {}} initialIntent={composerIntent} />
    </div>
  );
}
