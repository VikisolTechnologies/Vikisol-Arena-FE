"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getMyProfile } from "@/lib/api/profile";
import { getNearby, requestJoin } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { PostComposer } from "@/components/feed/PostComposer";
import { ARENA_V3 } from "./tokens";
import { ActivityCard } from "./ActivityCard";
import { NeedCard } from "./NeedCard";
import { HomeTabBar } from "./HomeTabBar";
import type { CandidateProfile, Post } from "@/lib/types";

// Hero image credit: "People enjoy the city lights at night" by Jimmy Whitson on Unsplash,
// https://unsplash.com/photos/hbfPov6ty0s, Unsplash License (free to use). Real photography,
// recorded per ARENA-PHASE-1-BUILD.md §2's "record source and licence for everything that ships".
const HERO_IMAGE = "https://images.unsplash.com/photo-1741135741999-17396584a1c9";

type LoadState = "loading" | "ready" | "error";

/**
 * ARENA-PHASE-1-BUILD.md §3.1 Home. The static hero frame (image, overlay, wordmark, bell,
 * gold rule) is what a server component would render motionlessly - this whole screen is one
 * "use client" tree instead, because Next still server-renders a client component's first pass
 * to real HTML (it isn't a client-only shell), so the hero's actual pixels are still present in
 * the initial response with zero JS required to see them. What genuinely can't be server-
 * rendered under this app's current JWT-in-localStorage session model (no server-readable auth)
 * is the PERSONALIZED text inside it - the real nearby-today count and the join feed both need
 * this user's own token, which only exists in the browser. That's an honest, incremental
 * compromise given a documented pre-existing architecture constraint, not a decision made here:
 * the hero's frame never waits on it, only the numbers inside it do, and they show a skeleton
 * (never a fake number) until they resolve - usually well under a second, since getMyProfile()
 * is now cached (PERF-REPORT.md Pass 4).
 */
export function HomeContent({ displayFont }: { displayFont: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [nearby, setNearby] = useState<Post[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getMyProfile();
        if (cancelled) return;
        setProfile(p);
        if (p.approxLat != null && p.approxLng != null) {
          const posts = await getNearby({ lat: p.approxLat, lng: p.approxLng, radiusKm: 10, withinHours: 24 });
          if (cancelled) return;
          setNearby(posts.filter((post) => post.intentType === "activity" || post.intentType === "ask"));
        }
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const hasLocation = profile?.approxLat != null && profile?.approxLng != null;
  const count = nearby.length;
  const cityLabel = profile?.homeCity ? profile.homeCity.toUpperCase() : "YOUR AREA";

  async function handleJoin(post: Post) {
    setJoiningId(post.id);
    setJoinError(null);
    try {
      await requestJoin(post.id);
      setNearby((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, myJoinStatus: p.visibility === "public" ? "approved" : "pending" } : p)),
      );
    } catch {
      setJoinError("Couldn't send that request — try again.");
    } finally {
      setJoiningId(null);
    }
  }

  function refreshAfterPost() {
    if (profile?.approxLat != null && profile?.approxLng != null) {
      getNearby({ lat: profile.approxLat, lng: profile.approxLng, radiusKm: 10, withinHours: 24 })
        .then((posts) => setNearby(posts.filter((post) => post.intentType === "activity" || post.intentType === "ask")))
        .catch(() => {});
    }
  }

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: 290, flexShrink: 0, overflow: "hidden", background: ARENA_V3.espresso }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130, background: ARENA_V3.espressoLight }} />
        <Image src={HERO_IMAGE} alt="" fill priority sizes="600px" style={{ objectFit: "cover", opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(34,28,23,0.15) 0%, rgba(34,28,23,0.75) 100%)" }} />
        <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#C9BFB1", letterSpacing: 4 }}>ARENA</span>
          <Bell size={17} color="#E8DFD2" strokeWidth={1.75} />
        </div>
        <div style={{ position: "absolute", bottom: 24, left: 20, right: 20 }}>
          {state === "loading" && (
            <>
              <div style={{ width: 150, height: 10, background: "rgba(247,241,234,0.22)", borderRadius: 4, marginBottom: 14 }} />
              <div style={{ width: 210, height: 30, background: "rgba(247,241,234,0.16)", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ width: 130, height: 30, background: "rgba(247,241,234,0.16)", borderRadius: 6 }} />
            </>
          )}
          {state === "error" && (
            <p style={{ margin: 0, fontFamily: displayFont, fontSize: 26, lineHeight: 1.2, color: ARENA_V3.ivory }}>
              Couldn&apos;t load what&apos;s nearby
            </p>
          )}
          {state === "ready" && (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 10, color: ARENA_V3.gold, letterSpacing: 3.5 }}>{cityLabel} · TODAY</p>
              <p style={{ margin: 0, fontFamily: displayFont, fontWeight: 400, fontSize: 32, lineHeight: 1.1, color: ARENA_V3.ivory }}>
                {!hasLocation ? (
                  <>
                    Turn on location
                    <br />
                    to see what&apos;s near
                  </>
                ) : count === 0 ? (
                  <>
                    Nothing nearby
                    <br />
                    yet today
                  </>
                ) : (
                  <>
                    {count} thing{count === 1 ? "" : "s"}
                    <br />
                    near you
                  </>
                )}
              </p>
            </>
          )}
          <div style={{ width: 36, height: 1, background: ARENA_V3.gold, marginTop: 16 }} />
          {state === "ready" && !hasLocation && (
            <Link href="/settings" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "#E8DFD2", textDecoration: "underline" }}>
              Turn on location in Settings
            </Link>
          )}
          {state === "ready" && hasLocation && count === 0 && (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "#E8DFD2", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              Start something for today
            </button>
          )}
        </div>
      </div>

      {/* HomeTabBar is position:fixed (not sticky - see its own comment on why), so it no
          longer reserves its own space in flow; this bottom padding stands in for that,
          matching AppShell's own pb-24 reservation for its bottom tab bar. */}
      <div style={{ flex: 1, paddingTop: 14, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        {state === "loading" &&
          [0, 1].map((i) => (
            <div key={i} style={{ background: ARENA_V3.white, margin: "0 12px 12px", borderRadius: 14, height: 112 + 78, opacity: 0.5 }} />
          ))}

        {state === "ready" &&
          nearby.map((post) =>
            post.intentType === "activity" ? (
              <ActivityCard key={post.id} post={post} displayFont={displayFont} onJoin={handleJoin} joining={joiningId === post.id} />
            ) : (
              <NeedCard key={post.id} post={post} displayFont={displayFont} />
            ),
          )}

        {joinError && (
          <p style={{ margin: "0 12px 12px", fontSize: 12, color: "#B23B3B" }}>{joinError}</p>
        )}
      </div>

      <HomeTabBar onCompose={() => setComposerOpen(true)} />

      <PostComposer
        key={composerOpen ? "open" : "closed"}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={refreshAfterPost}
        defaultIntent="activity"
      />
    </div>
  );
}
