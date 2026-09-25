"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, HelpCircle, PenLine } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { PostMedia } from "@/components/posts/PostMedia";
import { VoteControl } from "@/components/posts/VoteControl";
import { getFeed, getTrending } from "@/lib/api/posts";
import { search } from "@/lib/api/search";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

// Discuss: the one home for posts that aren't activities - questions, needs, updates (Arena
// restructure, Phase 1). Activities live on Nearby; a thread opens at /feed/[id].
//
// Sorted by New or Trending from the real /posts endpoints. Typing in the search box searches
// every discussion on Arena (GET /search, type=discussions), not just the ones loaded here.
type Sort = "new" | "top" | "trending";
type DiscussIntent = "ask" | "update";

const KIND_LABEL: Record<string, string> = { ask: "Question", update: "Update" };

function ThreadRow({ post }: { post: Post }) {
  const text = post.title || post.body;
  const href = `/feed/${post.id}`;
  // Media sits between two links rather than inside one - tapping a video must play it.
  return (
    <article className="rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-secondary/40">
      <Link href={href} className="block">
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
      </Link>
      <PostMedia urls={post.mediaUrls} className="mt-3" width={720} />
      <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
        <VoteControl post={post} />
        <Link href={href} className="flex items-center gap-1.5 rounded-full px-2 py-1.5 hover:bg-secondary hover:text-foreground">
          <MessageCircle className="size-3.5" /> {post.commentCount} {post.commentCount === 1 ? "reply" : "replies"}
        </Link>
      </div>
    </article>
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
    (sort === "trending" ? getTrending(0, 50) : getFeed(0, 100))
      .then((all) => all.filter((p) => p.intentType === "ask" || p.intentType === "update"))
      // Top = most upvoted first (ties: newest first).
      .then((threads) => (sort === "top" ? threads.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) : threads))
      .catch(() => [] as Post[])
      .then((threads) => !cancelled && setResult({ key, posts: threads }));
    return () => {
      cancelled = true;
    };
  }, [router, sort, key]);
  const posts = result?.key === key ? result.posts : null;

  const q = query.trim();
  const searchKey = q.toLowerCase();
  // Same keyed-result pattern as the list above: a result only shows under the query it answers.
  const [found, setFound] = useState<{ key: string; posts: Post[] } | null>(null);
  useEffect(() => {
    if (searchKey.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      search(searchKey, "discussions", 50)
        .then((r) => !cancelled && setFound({ key: searchKey, posts: r.discussions }))
        .catch(() => !cancelled && setFound({ key: searchKey, posts: [] }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchKey]);
  const searching = searchKey.length >= 2;
  const visible = searching ? (found?.key === searchKey ? found.posts : null) : posts;

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
            <span className="sr-only">Search discussions</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="discuss-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all discussions…"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div role="tablist" aria-label="Sort" className="flex shrink-0 gap-1 rounded-full border border-border bg-card p-1">
            {(["new", "top", "trending"] as Sort[]).map((s) => (
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
