"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";
import { getMyProfile, updateMyLocation } from "@/lib/api/profile";
import { getNearby, requestJoin } from "@/lib/api/posts";
import { getFeedItems } from "@/lib/api/feed";
import { getJobs } from "@/lib/api/jobs";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { ActivityCard } from "./ActivityCard";
import { NeedCard } from "./NeedCard";
import { HomeEmptyStateDark } from "./HomeEmptyStateDark";
import { HomeMobileTabBar } from "./HomeMobileTabBar";
import { HomeSidebar } from "./HomeSidebar";
import type { CandidateProfile, FeedItem, Job, Post } from "@/lib/types";

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
 * Home, on Arena's real ecosystem brand (dark background, orange accent, Space Grotesk +
 * Inter - verified against globals.css :root and Vikisol Technologies' own site) instead of
 * the ivory/gold "product theme" this screen used before, which the codebase itself scopes to
 * an unfinished, not-yet-app-wide experiment. Desktop gets a persistent left shell
 * (HomeSidebar) in place of a top nav bar; mobile keeps a top bar + bottom tab bar, both
 * re-themed. All the real behavior below (location, join, composer, guest browsing) is
 * unchanged from before - only the shell and colors around it moved.
 */
export function HomeContent() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
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
  // Onboarding's job-intent question ("here for a job" vs "just exploring") previously had no
  // effect on what the feed actually showed - same undifferentiated activity/ask list either
  // way. This is what makes it actually change the feed: job-seekers additionally see real
  // matching postings (Job.matchPercentage is already computed server-side, see ScoringService)
  // up top; "just exploring" users see the feed exactly as before, untouched.
  const [matchingJobs, setMatchingJobs] = useState<Job[] | null>(null);
  // Shown only when matchingJobs isn't (guest, or a profile that isn't flagged as job-seeking) -
  // a handful of real open roles/projects pulled from the same general feed fetch below, so
  // "browse Arena" always includes a taste of the job/bidding side, not just activities.
  const [feedJobItems, setFeedJobItems] = useState<FeedItem[]>([]);
  // "Enter as guest" - Home renders fully signed-out; this is the one gate every mutating
  // action (join, post, turn on location) funnels through instead of a page-load redirect.
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [signInAction, setSignInAction] = useState("do that");

  useEffect(() => {
    // Client-only reads (SSR has neither sessionStorage nor a real answer for getSession())
    // flipping post-hydration state - same pattern AppShell's own loggedIn flag already uses
    // for the identical class of problem.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocationAskDismissed(sessionStorage.getItem(LOCATION_ASK_DISMISSED_KEY) === "1");
    setSignedIn(!!getSession());
  }, []);

  // ARENA-WEB-AND-SEED.md §3.2 "The feed with location off shows... global and city-wide posts...
  // Never blank." §1.2 named this as "the single worst thing" in the previous build - an empty
  // viewport below the hero whenever location was off. getFeedItems() (the same general,
  // recency-ranked feed Home's own pre-rebuild version used) is the real, honest fallback content
  // source. Extended here to also cover the has-location-but-nearby-is-sparse case (a narrow
  // 10km/24h geo+time query can legitimately come back empty even when there's plenty of real
  // content elsewhere) - "never blank" only actually holds if the fallback applies whenever
  // there's little to show, not only when location is off outright.
  async function loadGeneralFeed() {
    const items = await getFeedItems("for-you", 0, 30);
    const posts = items.filter((i) => i.itemType === "activity" || i.itemType === "ask").map(feedItemToPost);
    const jobItems = items.filter((i) => i.itemType === "job" || i.itemType === "project").slice(0, 3);
    return { posts, jobItems };
  }

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    (async () => {
      try {
        // A guest has no CandidateProfile to fetch, no matching-jobs enrichment, and no saved
        // location - the general-feed fallback below is the same honest content a signed-in
        // user with location off already sees, not a degraded/placeholder guest view.
        let p: CandidateProfile | null = null;
        let sawJobSeeker = false;
        if (getSession()) {
          p = await getMyProfile();
          if (cancelled) return;
          setProfile(p);
          if (p.cameForJob === true) {
            sawJobSeeker = true;
            getJobs()
              .then((jobs) => {
                if (cancelled) return;
                setMatchingJobs(jobs.slice().sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 3));
              })
              .catch(() => {
                // Best-effort - the jobs section just doesn't render if this fails, same as any
                // other optional feed enrichment; never blocks the rest of the page loading.
              });
          }
        }

        let nearbyPosts: Post[] = [];
        if (p?.approxLat != null && p?.approxLng != null) {
          const posts = await getNearby({ lat: p.approxLat, lng: p.approxLng, radiusKm: 10, withinHours: 24 });
          if (cancelled) return;
          nearbyPosts = posts.filter((post) => post.intentType === "activity" || post.intentType === "ask");
        }

        if (nearbyPosts.length > 0) {
          setFeedPosts(nearbyPosts);
        } else {
          const general = await loadGeneralFeed();
          if (cancelled) return;
          setFeedPosts(general.posts);
          // Only a teaser when there's no already-personalized "matching jobs" row for this
          // profile - avoids showing the same kind of content twice on one page.
          if (!sawJobSeeker) setFeedJobItems(general.jobItems);
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

  // ARENA-WEB-AND-SEED.md §1.3/§3.3 - a real button that calls the browser's own geolocation
  // API directly (the exact same call Settings' "Precise" option makes - see updateMyLocation),
  // not a text link that sends the visitor away to a different page. On success the hero and
  // feed update IN PLACE (no navigation, no reload); §3.3's "local content is blended into the
  // feed" - nearby results are merged ahead of whatever the global fallback already showed,
  // deduped by id, rather than replacing it outright.
  function enableLocation() {
    if (!getSession()) {
      setSignInAction("save your location");
      setSignInPromptOpen(true);
      return;
    }
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
  // location ask for the session." The feed is already showing general content by default
  // whenever location is off (see loadGeneralFeed above) - this only softens the hero's own
  // copy so it stops asking, for the rest of this browser session.
  function dismissLocationAsk() {
    sessionStorage.setItem(LOCATION_ASK_DISMISSED_KEY, "1");
    setLocationAskDismissed(true);
  }

  async function handleJoin(post: Post) {
    if (!getSession()) {
      setSignInAction("join this");
      setSignInPromptOpen(true);
      return;
    }
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

  // Generic "+" entry points (header, tab bar) show SCREEN 3's intent picker first, rather than
  // assuming Activity - a suggestion card that already names its intent skips straight there.
  function openComposerPicker() {
    if (!getSession()) {
      setSignInAction("post");
      setSignInPromptOpen(true);
      return;
    }
    setComposerIntent(null);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  function refreshAfterPost() {
    if (profile?.approxLat != null && profile?.approxLng != null) {
      getNearby({ lat: profile.approxLat, lng: profile.approxLng, radiusKm: 10, withinHours: 24 })
        .then((posts) => {
          const nearby = posts.filter((post) => post.intentType === "activity" || post.intentType === "ask");
          if (nearby.length > 0) setFeedPosts(nearby);
          else loadGeneralFeed().then((g) => setFeedPosts(g.posts)).catch(() => {});
        })
        .catch(() => {});
    } else {
      loadGeneralFeed().then((g) => setFeedPosts(g.posts)).catch(() => {});
    }
  }

  const headline =
    state === "ready"
      ? hasLocation
        ? nearbyCount === 0
          ? "Nothing nearby yet today"
          : `${nearbyCount} thing${nearbyCount === 1 ? "" : "s"} near you`
        : locationAskDismissed
          ? "What's happening in Hyderabad"
          : "Turn on location to see what's near"
      : null;

  // Jenny is UI-only in this pass (no AI backend wired up yet) - this line only ever states
  // numbers already fetched for real above; it never invents activity that isn't there.
  const jennyNote =
    matchingJobs != null && matchingJobs.length > 0
      ? `${nearbyCount > 0 ? `${nearbyCount} things nearby, and ` : ""}${matchingJobs.length} job${matchingJobs.length === 1 ? "" : "s"} matching you.`
      : nearbyCount > 0
        ? `${nearbyCount} thing${nearbyCount === 1 ? "" : "s"} nearby right now.`
        : null;

  return (
    <div className="flex min-h-dvh bg-background">
      <HomeSidebar profile={profile} signedIn={signedIn} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar - the sidebar covers this on desktop */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
            Arena<span style={{ color: "var(--primary)" }}>.</span>
          </span>
          <Bell size={18} strokeWidth={1.75} color="var(--muted-foreground)" />
        </div>

        {/* Jenny, mobile - pinned under the top bar rather than a banner that scrolls away.
            Same "UI only, honestly disabled" treatment as the sidebar's box. */}
        <div className="px-4 py-2.5 md:hidden" style={{ background: "var(--popover)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1.5" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, background: "radial-gradient(circle at 32% 30%, var(--primary-soft), var(--primary) 70%)" }} />
            <input
              type="text"
              disabled
              placeholder="Ask Jenny anything…"
              aria-label="Ask Jenny (coming soon)"
              className="flex-1 bg-transparent text-[12px]"
              style={{ color: "var(--faint)", border: "none", cursor: "not-allowed" }}
            />
          </div>
        </div>

        <div className="flex-1 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-10">
          <div className="mx-auto w-full max-w-[780px] px-4 pt-5 md:px-9 md:pt-7">
            <div className="mb-4 flex items-baseline justify-between">
              {state === "loading" && <div className="h-6 w-48 animate-pulse rounded" style={{ background: "var(--muted)" }} />}
              {state === "error" && (
                <h1 className="font-display text-[22px] font-semibold" style={{ color: "var(--foreground)" }}>
                  Couldn&apos;t load what&apos;s nearby
                </h1>
              )}
              {state === "ready" && (
                <h1 className="font-display text-[22px] font-semibold md:text-[24px]" style={{ color: "var(--foreground)" }}>
                  {headline}
                </h1>
              )}
            </div>

            {state === "ready" && !hasLocation && !locationAskDismissed && (
              <div
                className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <button
                  type="button"
                  onClick={enableLocation}
                  disabled={locating}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={{ background: "var(--primary)", color: "var(--primary-foreground)", opacity: locating ? 0.7 : 1 }}
                >
                  {locating ? "Locating…" : "Turn on location"}
                </button>
                <button
                  type="button"
                  onClick={dismissLocationAsk}
                  className="text-[12px] underline"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Show me what&apos;s happening everywhere
                </button>
                {locationBlocked && (
                  <p className="w-full text-[11px] leading-relaxed" style={{ color: "var(--faint)" }}>
                    Location is blocked for this site. Look for the site-info icon in your browser&apos;s address bar → Site settings → Location, to turn it back on.
                  </p>
                )}
              </div>
            )}

            {state === "ready" && jennyNote && (
              <div
                className="mb-5 flex items-center gap-3 rounded-2xl px-4 py-3.5"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--primary)" stroke="none" className="shrink-0">
                  <path d="M12 2 14 9l7 2-7 2-2 7-2-7-7-2 7-2Z" />
                </svg>
                <p className="text-[13px]" style={{ color: "var(--foreground)" }}>
                  <span className="font-semibold">Jenny noticed:</span> {jennyNote}
                </p>
              </div>
            )}

            {matchingJobs != null && matchingJobs.length > 0 && (
              <div className="mb-5">
                <p className="mb-2.5 text-[10px] tracking-[3px]" style={{ color: "var(--muted-foreground)" }}>
                  JOBS MATCHING YOU
                </p>
                <div className="flex flex-col gap-2">
                  {matchingJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold" style={{ color: "var(--foreground)" }}>
                          {job.title}
                        </p>
                        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
                          {job.company} · {job.remote ? "Remote" : job.location}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold" style={{ color: "var(--foreground)" }}>
                        {job.matchPercentage}% match
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {feedJobItems.length > 0 && (
              <div className="mb-5">
                <p className="mb-2.5 text-[10px] tracking-[3px]" style={{ color: "var(--muted-foreground)" }}>
                  ON ARENA RIGHT NOW
                </p>
                <div className="flex flex-col gap-2">
                  {feedJobItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.itemType === "job" ? `/jobs/${item.id}` : `/marketplace/${item.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold" style={{ color: "var(--foreground)" }}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
                          {item.itemType === "job"
                            ? `${item.authorCompanyName ?? "A company"} · ${item.remote ? "Remote" : (item.locationText ?? "Hyderabad")}`
                            : `₹${item.budgetMin?.toLocaleString("en-IN")}–₹${item.budgetMax?.toLocaleString("en-IN")} · ${item.bidCount ?? 0} bids`}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold tracking-wide" style={{ color: "var(--muted-foreground)" }}>
                        {item.itemType === "job" ? "JOB" : "BIDDING"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {state === "loading" &&
              [0, 1].map((i) => (
                <div key={i} className="mb-3 rounded-2xl" style={{ background: "var(--card)", height: 112 + 78, opacity: 0.5 }} />
              ))}

            {state === "ready" && feedPosts.length === 0 && (
              <HomeEmptyStateDark
                headline={hasLocation ? "Nothing nearby right now" : "It's quiet right now"}
                description={
                  hasLocation
                    ? "No activities or needs posted near you in the last day. Check the map for a wider radius, or be the first to start something."
                    : "Nothing posted recently. Be the first to start something today."
                }
                primaryActionLabel="Start something"
                onPrimaryAction={openComposerPicker}
              />
            )}

            {state === "ready" && feedPosts.length > 0 && (
              <p className="mb-2.5 text-[10px] tracking-[3px]" style={{ color: "var(--muted-foreground)" }}>
                HAPPENING NOW
              </p>
            )}

            {state === "ready" &&
              feedPosts.map((post) =>
                post.intentType === "activity" ? (
                  <ActivityCard key={post.id} post={post} onJoin={handleJoin} joining={joiningId === post.id} />
                ) : (
                  <NeedCard key={post.id} post={post} />
                ),
              )}

            {joinError && (
              <p className="px-3 pb-3 text-[12px]" style={{ color: "#f87171" }}>
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
                      className="underline"
                      style={{ background: "none", border: "none", padding: 0, color: "var(--foreground)", cursor: "pointer", fontSize: 12 }}
                    >
                      Go to Settings
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <HomeMobileTabBar onCompose={openComposerPicker} />
      </div>

      <CreateComposer
        key={composerSession}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={refreshAfterPost}
        initialIntent={composerIntent}
      />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action={signInAction} />
    </div>
  );
}
