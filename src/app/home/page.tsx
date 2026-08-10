"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedItemCard } from "@/components/feed/FeedItemCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { getMyProfile } from "@/lib/api/profile";
import { getFeedItems } from "@/lib/api/feed";
import { getNearby } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import type { CandidateProfile, FeedItem, FeedTab, Post, PostIntentType } from "@/lib/types";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "for-you", label: "For you" },
  { key: "nearby", label: "Nearby" },
  { key: "following", label: "Following" },
];

// PART 7.5's composer trigger row "quick type chips" - Job/Project already have their own
// mature create flows (enterprise job posting, marketplace project posting) so those chips
// deep-link there instead of duplicating a second creation path through this generic composer;
// Activity/Ask/Update open PostComposer preset to that type (see PostComposer's defaultIntent).
const QUICK_CHIPS: { label: string; intent?: PostIntentType; href?: string }[] = [
  { label: "Activity", intent: "activity" },
  { label: "Ask", intent: "ask" },
  { label: "Update", intent: "update" },
  { label: "Project", href: "/marketplace" },
];

function TrendingTagsRail({ items }: { items: FeedItem[] }) {
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag);
  }, [items]);
  if (tags.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 champagne-hairline text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trending tags</h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="bg-white/5 text-[11px] text-muted-foreground">#{t}</Badge>
        ))}
      </div>
    </div>
  );
}

function NearbyNowRail({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 champagne-hairline text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nearby now</h3>
      <div className="flex flex-col gap-2">
        {posts.slice(0, 3).map((p) => (
          <a key={p.id} href={`/feed/${p.id}`} className="rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-xs transition-colors hover:bg-white/[0.06]">
            <p className="line-clamp-1 font-medium">{p.body}</p>
            <p className="mt-0.5 text-muted-foreground">{p.locationText ?? "Nearby"} · {p.spotsFilled}{p.capacity ? `/${p.capacity}` : ""} joined</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function RightRail({ items, profile }: { items: FeedItem[]; profile: CandidateProfile | null }) {
  const [nearby, setNearby] = useState<Post[]>([]);

  useEffect(() => {
    // Reuses the location the viewer already consented to during onboarding (CandidateProfile's
    // stored approxLat/approxLng) - never prompts a fresh Geolocation request just to fill a
    // feed sidebar. Silently empty (not an error state) when no consent was ever given.
    if (profile?.approxLat == null || profile?.approxLng == null) return;
    getNearby({ lat: profile.approxLat, lng: profile.approxLng, radiusKm: 10 }).then(setNearby).catch(() => setNearby([]));
  }, [profile?.approxLat, profile?.approxLng]);

  return (
    <div className="flex flex-col gap-6">
      <TrendingTagsRail items={items} />
      <NearbyNowRail posts={nearby} />
      {/* PART 7.5 "one Promoted slot" - honest empty state until Step 10 (promotions) ships a
          real campaign to show here; PRODUCT_BIBLE.md principle #2: no fabricated content. */}
      <div>
        <h3 className="mb-2 champagne-hairline text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promoted</h3>
        <div className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
          Promotions launch with Step 10 - nothing to show yet.
        </div>
      </div>
    </div>
  );
}

function HomePageInner() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerIntent, setComposerIntent] = useState<PostIntentType>("activity");

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
  }, [router]);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getFeedItems(tab).then(setItems);
  }, [router, tab]);

  const switchTab = (next: FeedTab) => {
    setItems(null);
    setTab(next);
  };

  const openComposer = (intent: PostIntentType) => {
    setComposerIntent(intent);
    setComposerOpen(true);
  };

  return (
    <AppShell title="Home" profile={profile} rightRail={items ? <RightRail items={items} profile={profile} /> : undefined}>
      {/* PART 7.5 composer trigger row - doubles as R1's "black composer bar" contrast block:
          the design doc explicitly names this as Home's one deep-contrast element (§R1),
          against the rest of the ivory feed below. */}
      <button
        type="button"
        onClick={() => openComposer("activity")}
        className="mb-3 flex w-full items-center gap-3 rounded-full bg-ink px-4 py-3 text-left text-sm text-white/60 shadow-[var(--shadow-card-rest)] transition-colors hover:bg-ink-800"
      >
        <PersonAvatar seed={profile?.id ?? "me"} name={profile?.name ?? "You"} size="sm" className="champagne-ring" />
        What do you need?
      </button>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => (chip.href ? router.push(chip.href) : openComposer(chip.intent!))}
            className="rounded-full border border-border bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-1 rounded-full border border-border bg-card p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              tab === key ? "bg-primary/15 text-primary-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!items ? (
        <OrbLoader className="h-64" />
      ) : items.length === 0 ? (
        <EmptyState
          title={tab === "following" ? "Nothing from people you follow yet" : "Nothing here yet"}
          description={tab === "following" ? "Follow people and companies to fill this." : "Follow people and companies, or be the first to post."}
          className="py-16"
        />
      ) : (
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {items.map((item) => (
            <FeedItemCard key={`${item.itemType}-${item.id}`} item={item} />
          ))}
        </div>
      )}

      <PostComposer
        key={composerIntent}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        defaultIntent={composerIntent}
        onPublished={() => {
          setItems(null);
          getFeedItems(tab).then(setItems);
        }}
      />
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<AppShell title="Home"><OrbLoader className="h-96" /></AppShell>}>
      <HomePageInner />
    </Suspense>
  );
}
