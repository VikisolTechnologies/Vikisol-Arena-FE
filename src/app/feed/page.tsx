"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { getMyProfile } from "@/lib/api/profile";
import { getFeed, getTrending } from "@/lib/api/posts";
import { requireOnboarded } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";
import type { CandidateProfile, Post } from "@/lib/types";

function FeedPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sort, setSort] = useState<"forYou" | "trending">("forYou");

  const load = () => { (sort === "trending" ? getTrending() : getFeed()).then(setPosts); };

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
    load();
    if (searchParams.get("compose") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time query-param read on mount
      setComposerOpen(true);
      router.replace("/feed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams, sort]);

  if (!profile) {
    return (
      <CandidateAppShell title="Feed">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell
      title="Feed"
      profile={profile}
      actions={
        <Button variant="primary-gradient" size="sm" className="gap-1.5" onClick={() => setComposerOpen(true)}>
          <Plus className="size-3.5" /> Post
        </Button>
      }
    >
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
          title="Nothing in your feed yet"
          description="Be the first to post - an activity, a question, or just an update."
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onClick={() => router.push(`/feed/${post.id}`)} />
          ))}
        </div>
      )}

      <PostComposer open={composerOpen} onOpenChange={setComposerOpen} onPublished={load} />
    </CandidateAppShell>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<CandidateAppShell title="Feed"><OrbLoader className="h-96" /></CandidateAppShell>}>
      <FeedPageInner />
    </Suspense>
  );
}
