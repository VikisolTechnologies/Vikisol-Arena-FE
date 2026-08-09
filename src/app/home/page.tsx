"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "@/components/feed/PostCard";
import { getMyProfile } from "@/lib/api/profile";
import { getFeed, getTrending } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Post } from "@/lib/types";

/**
 * ARENA-MASTER-ARCHITECTURE.md PART 7.5 — the new /home route. This is the PART 15 Step 1
 * deliverable (shell + navigation + a real page using it), not yet the full Step 5 rebuild:
 * no composer-trigger row, quick type chips, Nearby rail, or right-rail content yet - those
 * land with Step 5's actual feed/composer work, on top of this real shell + real data.
 * /feed keeps working standalone in the meantime (see ROUTES.md) - this doesn't replace it
 * yet, it's the new route the master spec wants /feed's traffic to move to eventually.
 */
function HomePageInner() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [sort, setSort] = useState<"forYou" | "trending">("forYou");

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    (sort === "trending" ? getTrending() : getFeed()).then(setPosts);
  }, [router, sort]);

  return (
    <AppShell title="Home" profile={profile}>
      <div className="mb-4 flex gap-1 rounded-full border border-border bg-white/[0.03] p-1 w-fit">
        {(["forYou", "trending"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              sort === s ? "bg-primary/15 text-primary-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "forYou" ? "For you" : "Trending"}
          </button>
        ))}
      </div>

      {!posts ? (
        <OrbLoader className="h-64" />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Follow people and companies, or be the first to post."
          className="py-16"
        />
      ) : (
        <div className="mx-auto flex max-w-[640px] flex-col gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => router.push(`/feed/${post.id}`)} />
          ))}
        </div>
      )}
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
