"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Heart, Search, HelpCircle, PenLine } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { getFeed, getTrending } from "@/lib/api/posts";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

// Discuss: the one home for posts that aren't activities - questions, needs, updates (Arena
// restructure, Phase 1). Activities live on Nearby; a thread opens at /feed/[id].
//
// Phase 1 scope, stated plainly: sorted by New or Trending from the real /posts endpoints, and
// the search box filters the threads already loaded here. Communities, upvotes, full-text
// search across all threads, and anonymous posting are Phase 2 backend work - not faked here.
type Sort = "new" | "trending";
type DiscussIntent = "ask" | "update";

const KIND_LABEL: Record<string, string> = { ask: "Question", update: "Update" };

function ThreadRow({ post }: { post: Post }) {
  const text = post.title || post.body;
  return (
    <Link href={`/feed/${post.id}`} className="block rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-secondary">
      <div className="mb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">{post.authorName}</span>
        <span aria-hidden>·</span>
        <span>{formatTimeAgo(post.createdAt)}</span>
        {post.locationText && (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{post.locationText}</span>
          </>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {post.demoContent && <DemoContentBadge />}
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {KIND_LABEL[post.intentType] ?? "Post"}
          </span>
        </span>
      </div>
      <p className="line-clamp-3 font-display text-[16px] font-medium leading-snug text-foreground">{text}</p>
      {post.title && post.body && post.body !== post.title && (
        <p className="mt-1.5 line-clamp-2 text-[13px] text-muted-foreground">{post.body}</p>
      )}
      <div className="mt-3 flex items-center gap-4 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-3.5" /> {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="size-3.5" /> {post.reactionCount}
        </span>
      </div>
    </Link>
  );
}

export default function DiscussPage() {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("new");
  // Keyed by the sort (and a reload counter) it was fetched for, so switching sort shows the
  // loader until the matching result lands - without resetting state synchronously in an effect.
  const [result, setResult] = useState<{ key: string; posts: Post[] } | null>(null);
  const [reloads, setReloads] = useState(0);
  const [query, setQuery] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [composerIntent, setComposerIntent] = useState<DiscussIntent>("ask");
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  const key = `${sort}:${reloads}`;
  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    (sort === "new" ? getFeed(0, 50) : getTrending(0, 50))
      .then((all) => all.filter((p) => p.intentType === "ask" || p.intentType === "update"))
      .catch(() => [] as Post[])
      .then((threads) => !cancelled && setResult({ key, posts: threads }));
    return () => {
      cancelled = true;
    };
  }, [router, sort, key]);
  const posts = result?.key === key ? result.posts : null;

  const visible = useMemo(() => {
    if (!posts) return null;
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => `${p.title ?? ""} ${p.body} ${p.authorName} ${p.locationText ?? ""}`.toLowerCase().includes(q));
  }, [posts, query]);

  function start(intent: DiscussIntent) {
    if (!getSession()) {
      setSignInPromptOpen(true);
      return;
    }
    setComposerIntent(intent);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  return (
    <AppShell title="Discuss">
      <div className="mx-auto w-full max-w-[780px]">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => start("ask")}>
            <HelpCircle className="size-3.5" /> Ask something
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start("update")}>
            <PenLine className="size-3.5" /> Share something
          </Button>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label htmlFor="discuss-search" className="relative flex-1">
            <span className="sr-only">Search threads</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="discuss-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search these threads…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div role="tablist" aria-label="Sort" className="flex shrink-0 gap-1 rounded-full border border-border bg-card p-1">
            {(["new", "trending"] as Sort[]).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={sort === s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                  sort === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {visible === null ? (
          <OrbLoader className="h-48" />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium">{query ? "No threads match that" : "No threads yet"}</p>
            <p className="text-[13px] text-muted-foreground">
              {query ? "Try different words, or start the thread yourself." : "Ask something or share something to get it going."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((p) => (
              <ThreadRow key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>

      <CreateComposer
        key={composerSession}
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onPublished={() => setReloads((n) => n + 1)}
        initialIntent={composerIntent}
      />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="post" />
    </AppShell>
  );
}
