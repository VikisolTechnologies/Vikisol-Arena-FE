"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "@/components/feed/PostCard";
import { getMyProfile } from "@/lib/api/profile";
import { getSavedPosts, unsavePost } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile, Post } from "@/lib/types";

// ARENA-INVENTORY-FIXES.md FIX 4 - the candidate nav (AppShell's SECONDARY_NAV_ITEMS) has
// linked here since PART 15 Step 2, 404ing on every click and prefetching a 404 on every page
// load in the background. Save/unsave itself (FeedItemCard's bookmark toggle, GET /posts/saved)
// was already fully built and working - only this list page was ever missing.
export default function SavedPostsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    getSavedPosts().then(setPosts);
  }, [router]);

  const unsave = async (postId: string) => {
    setPosts((prev) => prev?.filter((p) => p.id !== postId) ?? prev);
    try {
      await unsavePost(postId);
    } catch {
      // Best-effort revert if the call genuinely fails - re-fetch rather than guess at ordering.
      getSavedPosts().then(setPosts);
    }
  };

  if (!profile) {
    return (
      <AppShell title="Saved">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Saved" profile={profile}>
      {!posts ? (
        <OrbLoader className="h-64" />
      ) : posts.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the bookmark on any post in your feed to save it here."
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onClick={() => router.push(`/feed/${p.id}`)}
              showSaveToggle
              onToggleSave={() => unsave(p.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
