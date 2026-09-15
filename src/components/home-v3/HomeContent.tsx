"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell } from "lucide-react";
import { getMyProfile, updateMyLocation } from "@/lib/api/profile";
import { getNearby, requestJoin } from "@/lib/api/posts";
import { getFeedItems } from "@/lib/api/feed";
import { requireOnboarded } from "@/lib/auth-guard";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { ARENA_V3 } from "./tokens";
import { ActivityCard } from "./ActivityCard";
import { NeedCard } from "./NeedCard";
import { HomeEmptyState } from "./HomeEmptyState";
import { HomeTabBar } from "./HomeTabBar";
import { HomeHeader } from "./HomeHeader";
import type { CandidateProfile, FeedItem, Post } from "@/lib/types";

// Hero image credit: "People play cricket on a street in India" by Zoshua Colah on Unsplash,
// https://unsplash.com/photos/klW2RayHc0s, Unsplash License (free to use). Real photography,
// recorded per ARENA-PHASE-1-BUILD.md §2's "record source and licence for everything that
// ships." Replaces an earlier choice (a Hong Kong harbour photo) that ARENA-WEB-AND-SEED.md
// §1.6 correctly flagged: "Arena is hyperlocal to Hyderabad. Imagery must plausibly be
// somewhere the user could be."
const HERO_IMAGE = "https://images.unsplash.com/photo-1753443279716-b2aaadb7e08f";
const LOCATION_ASK_DISMISSED_KEY = "arena_home_location_ask_dismissed";

type LoadState = "loading" | "ready" | "error";

// A FeedItem (from the general, non-geo-scoped /feed) doesn't carry every Post field a card
// needs (joinable/myJoinStatus aren't populated on it) - this fills in the same defaults the
// card components already treat as "not yet actioned," so the fallback feed renders with the
// exact same components as the real nearby list rather than needing a second card variant.
function feedItemToPost(item: FeedItem): Post {
  return {
    id: item.id,
    authorUserId: item.authorUserId ?? "",
    authorName: item.authorName ?? "Someone",
    authorEmoji: item.authorEmoji ?? "🧑🏽",
    intentType: item.itemType === "activity" || item.itemType === "ask" ? item.itemType : "update",
    title: item.title,
    body: item.body,
    locationText: item.locationText,
    audience: "global",
    visibility: "public",
    capacity: item.capacity,
    spotsFilled: item.spotsFilled ?? 0,
    status: "open",
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    tags: item.tags,
    mediaUrls: item.mediaUrls,
    joinable: item.joinable ?? false,
    mine: item.mine,
    myJoinStatus: item.myJoinStatus,
    roomId: item.roomId,
    createdAt: item.createdAt,
    approxLat: item.approxLat,
    approxLng: item.approxLng,
    commentCount: item.commentCount ?? 0,
    reactionCount: item.reactionCount ?? 0,
    myReacted: item.myReacted,
    authorJoinCount: item.authorJoinCount ?? 0,
    authorAccountAgeDays: item.authorAccountAgeDays ?? 0,
    demoContent: item.demoContent ?? false,
  };
}

/**
 * ARENA-PHASE-1-BUILD.md §3.1 Home + ARENA-WEB-AND-SEED.md Parts 2/3. The static hero frame
 * (image, overlay, wordmark, bell, gold rule) is what a server component would render
 * motionlessly - this whole screen is one "use client" tree instead, because Next still
 * server-renders a client component's first pass to real HTML, so the hero's actual pixels are
 * still present in the initial response with zero JS required to see them. What genuinely can't
 * be server-rendered under this app's current JWT-in-localStorage session model (no
 * server-readable auth) is the PERSONALIZED text inside it - the real nearby-today count and the
 * join feed both need this user's own token. That's an honest, incremental compromise given a
 * documented pre-existing architecture constraint: the hero's frame never waits on it, only the
 * numbers inside it do, and they show a skeleton (never a fake number) until they resolve.
 */
export function HomeContent({ displayFont }: { displayFont: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerIntent, setComposerIntent] = useState<Exclude<Post["intentType"], "company"> | null>(null);
  // CreateComposer resets its internal draft by remounting (initial-state-only, no reset effect)
  // - bumped on every open so re-opening after a cancel never resurfaces a stale draft.
  const [composerSession, setComposerSession] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationAskDismissed, setLocationAskDismissed] = useState(false);

  useEffect(() => {
    // Client-only read (SSR has no sessionStorage) flipping post-hydration state, same pattern
    // AppShell's own loggedIn flag already uses for the identical class of problem.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocationAskDismissed(sessionStorage.getItem(LOCATION_ASK_DISMISSED_KEY) === "1");
  }, []);

  // ARENA-WEB-AND-SEED.md §3.2 "The feed with location off shows... global and city-wide posts...
  // Never blank." §1.2 named this as "the single worst thing" in the previous build - an empty
  // viewport below the hero whenever location was off. getFeedItems() (the same general,
  // recency-ranked feed Home's own pre-rebuild version used) is the real, honest fallback content
  // source; getNearby() (a real geo+time query) is used instead once location is actually granted.
  async function loadGlobalFeed() {
    const items = await getFeedItems("for-you", 0, 30);
    return items.filter((i) => i.itemType === "activity" || i.itemType === "ask").map(feedItemToPost);
  }

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
          setFeedPosts(posts.filter((post) => post.intentType === "activity" || post.intentType === "ask"));
        } else {
          const global = await loadGlobalFeed();
          if (cancelled) return;
          setFeedPosts(global);
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
  const nearbyCount = hasLocation ? feedPosts.length : 0;
  const cityLabel = profile?.homeCity ? profile.homeCity.toUpperCase() : "YOUR AREA";

  // ARENA-WEB-AND-SEED.md §1.3/§3.3 - a real button that calls the browser's own geolocation
  // API directly (the exact same call Settings' "Precise" option makes - see updateMyLocation),
  // not a text link that sends the visitor away to a different page. On success the hero and
  // feed update IN PLACE (no navigation, no reload); §3.3's "local content is blended into the
  // feed" - nearby results are merged ahead of whatever the global fallback already showed,
  // deduped by id, rather than replacing it outright.
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
          const nearby = await getNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: 10, withinHours: 24 });
          const nearbyPosts = nearby.filter((post) => post.intentType === "activity" || post.intentType === "ask");
          setFeedPosts((prev) => {
            const seen = new Set(nearbyPosts.map((p) => p.id));
            return [...nearbyPosts, ...prev.filter((p) => !seen.has(p.id))];
          });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        // GeolocationPositionError.PERMISSION_DENIED === 1 - distinct from a generic failure
        // (§3.4: "hard-denied permission is handled distinctly from 'not yet asked'").
        if (err.code === 1) setLocationBlocked(true);
      },
    );
  }

  // §3.1 "a secondary text action: 'Show me what's happening everywhere' - dismisses the
  // location ask for the session." The feed is already showing global content by default
  // whenever location is off (see loadGlobalFeed above) - this only softens the hero's own
  // copy so it stops asking, for the rest of this browser session.
  function dismissLocationAsk() {
    sessionStorage.setItem(LOCATION_ASK_DISMISSED_KEY, "1");
    setLocationAskDismissed(true);
  }

  async function handleJoin(post: Post) {
    setJoiningId(post.id);
    setJoinError(null);
    try {
      await requestJoin(post.id);
      setFeedPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, myJoinStatus: p.visibility === "public" ? "approved" : "pending" } : p)),
      );
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Couldn't send that request — try again.");
    } finally {
      setJoiningId(null);
    }
  }

  function openComposer(intent: Exclude<Post["intentType"], "company">) {
    setComposerIntent(intent);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  // Generic "+" entry points (header, tab bar) show SCREEN 3's intent picker first, rather than
  // assuming Activity - a suggestion card that already names its intent skips straight there.
  function openComposerPicker() {
    setComposerIntent(null);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  function refreshAfterPost() {
    if (profile?.approxLat != null && profile?.approxLng != null) {
      getNearby({ lat: profile.approxLat, lng: profile.approxLng, radiusKm: 10, withinHours: 24 })
        .then((posts) => setFeedPosts(posts.filter((post) => post.intentType === "activity" || post.intentType === "ask")))
        .catch(() => {});
    } else {
      loadGlobalFeed().then(setFeedPosts).catch(() => {});
    }
  }

  // ARENA-PHASE-1-BUILD.md §2 "Structure" - "Single column. 640px max on desktop, full-bleed on
  // mobile." The hero IMAGE stays full-bleed at any width; its text overlay, the card list, and
  // the nav's centered content all sit inside a centered 640px measure on wide viewports.
  const centeredAbsolute: CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    width: "min(640px, 100% - 40px)",
  };

  return (
    <div style={{ background: ARENA_V3.ivory, minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <HomeHeader profile={profile} onCompose={openComposerPicker} />

      {/* ARENA-WEB-AND-SEED.md §2.4 "The hero on desktop. Minimum height 420px... Headline
          scales to 44px on desktop." Only height/font-size are breakpoint-dependent, so only
          those move to a className - everything else (color, weight, positioning) stays inline
          with the rest of this screen's tokens. */}
      <div className="h-[290px] md:h-[420px]" style={{ position: "relative", flexShrink: 0, overflow: "hidden", background: ARENA_V3.espresso }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130, background: ARENA_V3.espressoLight }} />
        <Image src={HERO_IMAGE} alt="" fill priority sizes="1200px" style={{ objectFit: "cover", opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(34,28,23,0.15) 0%, rgba(34,28,23,0.75) 100%)" }} />
        {/* HomeHeader already carries the wordmark + notifications from md up - this hero-
            internal row is mobile-only branding on the photo itself (the mockup's own masthead
            treatment), not a second nav; showing both above 768px just duplicated it. */}
        <div className="flex md:hidden" style={{ ...centeredAbsolute, top: 16, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#C9BFB1", letterSpacing: 4 }}>ARENA</span>
          <Bell size={17} color="#E8DFD2" strokeWidth={1.75} />
        </div>
        {/* §2.4 "48px of breathing room beneath" the text block. */}
        <div style={{ ...centeredAbsolute, bottom: 48 }}>
          {state === "loading" && (
            <>
              <div style={{ width: 150, height: 10, background: "rgba(247,241,234,0.22)", borderRadius: 4, marginBottom: 14 }} />
              <div style={{ width: 210, height: 30, background: "rgba(247,241,234,0.16)", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ width: 130, height: 30, background: "rgba(247,241,234,0.16)", borderRadius: 6 }} />
            </>
          )}
          {state === "error" && (
            <p className="text-[26px] md:text-[36px]" style={{ margin: 0, fontFamily: displayFont, lineHeight: 1.2, color: ARENA_V3.ivory }}>
              Couldn&apos;t load what&apos;s nearby
            </p>
          )}
          {state === "ready" && (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 10, color: ARENA_V3.goldText, letterSpacing: 3.5 }}>
                {hasLocation ? `${cityLabel} · TODAY` : "HYDERABAD · TODAY"}
              </p>
              <p className="text-[32px] md:text-[44px]" style={{ margin: 0, fontFamily: displayFont, fontWeight: 400, lineHeight: 1.1, color: ARENA_V3.ivory }}>
                {hasLocation ? (
                  nearbyCount === 0 ? (
                    <>
                      Nothing nearby
                      <br />
                      yet today
                    </>
                  ) : (
                    <>
                      {nearbyCount} thing{nearbyCount === 1 ? "" : "s"}
                      <br />
                      near you
                    </>
                  )
                ) : locationAskDismissed ? (
                  <>
                    What&apos;s happening
                    <br />
                    in Hyderabad
                  </>
                ) : (
                  <>
                    Turn on location
                    <br />
                    to see what&apos;s near
                  </>
                )}
              </p>
            </>
          )}
          <div style={{ width: 36, height: 1, background: ARENA_V3.gold, marginTop: 16 }} />
          {state === "ready" && !hasLocation && !locationAskDismissed && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <button
                type="button"
                onClick={enableLocation}
                disabled={locating}
                style={{
                  fontSize: 12,
                  color: ARENA_V3.ink,
                  background: ARENA_V3.ivory,
                  border: "none",
                  borderRadius: 20,
                  padding: "8px 16px",
                  cursor: locating ? "default" : "pointer",
                  opacity: locating ? 0.7 : 1,
                }}
              >
                {locating ? "Locating…" : "Turn on location"}
              </button>
              {locationBlocked && (
                <p style={{ margin: 0, fontSize: 11, color: "#E8DFD2", maxWidth: 260, lineHeight: 1.5 }}>
                  Location is blocked for this site. Look for the site-info icon in your browser&apos;s address bar → Site settings → Location, to turn it back on.
                </p>
              )}
              <button
                type="button"
                onClick={dismissLocationAsk}
                style={{ fontSize: 12, color: "#E8DFD2", textDecoration: "underline", background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                Show me what&apos;s happening everywhere
              </button>
            </div>
          )}
        </div>
      </div>

      {/* HomeTabBar is position:fixed (not sticky), so it no longer reserves its own space in
          flow on mobile; this bottom padding stands in for that, matching AppShell's own pb-24
          reservation. Desktop uses HomeHeader instead (no bottom padding needed there), but the
          extra padding is harmless on desktop since nothing sits directly below the fold there. */}
      <div className="md:pb-6" style={{ flex: 1, paddingTop: 14, paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {state === "loading" &&
            [0, 1].map((i) => (
              <div key={i} style={{ background: ARENA_V3.white, margin: "0 12px 12px", borderRadius: 14, height: 112 + 78, opacity: 0.5 }} />
            ))}

          {state === "ready" && feedPosts.length === 0 && (
            <HomeEmptyState
              headline={hasLocation ? "Nothing nearby right now" : "It's quiet right now"}
              description={
                hasLocation
                  ? "No activities or needs posted near you in the last day. Check the map for a wider radius, or be the first to start something."
                  : "Nothing posted recently. Be the first to start something today."
              }
              primaryActionLabel="Start something"
              onPrimaryAction={openComposerPicker}
              onStartIntent={openComposer}
            />
          )}

          {state === "ready" &&
            feedPosts.map((post) =>
              post.intentType === "activity" ? (
                <ActivityCard key={post.id} post={post} displayFont={displayFont} onJoin={handleJoin} joining={joiningId === post.id} />
              ) : (
                <NeedCard key={post.id} post={post} displayFont={displayFont} />
              ),
            )}

          {joinError && (
            <p style={{ margin: "0 12px 12px", fontSize: 12, color: "#B23B3B" }}>
              {joinError}
              {/* ARENA-STABILIZE.md Phase 2, G5's fix, same gap as Post Detail/CreateComposer had
                  before their own fix - a fresh signup has no date of birth on file, so joining
                  an Activity 400s with a message pointing at Settings; give a real way there. */}
              {joinError.toLowerCase().includes("settings") && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => router.push("/settings")}
                    style={{ background: "none", border: "none", padding: 0, color: ARENA_V3.ink, textDecoration: "underline", cursor: "pointer", fontSize: 12 }}
                  >
                    Go to Settings
                  </button>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <HomeTabBar onCompose={openComposerPicker} />

      <CreateComposer
        key={composerSession}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={refreshAfterPost}
        initialIntent={composerIntent}
      />
    </div>
  );
}
