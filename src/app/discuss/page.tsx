"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, HelpCircle, PenLine, Plus, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { ThreadRow } from "@/components/discuss/ThreadRow";
import { CreateCommunityDialog } from "@/components/discuss/CreateCommunityDialog";
import { getTrending } from "@/lib/api/posts";
import { getThreads, listCommunities, myCommunities } from "@/lib/api/communities";
import { search } from "@/lib/api/search";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Community, Post } from "@/lib/types";

// Discuss: questions and updates - everything that isn't an activity. Threads can live in a
// user-created community or in general Discuss; this page lists all of them. A thread opens at
// /feed/[id]; a community at /discuss/c/[slug].
type Sort = "new" | "top" | "trending";
type DiscussIntent = "ask" | "update";

export default function DiscussPage() {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("new");
  // Keyed by the sort (and a reload counter) it was fetched for, so switching sort shows the
  // loader until the matching result lands - without resetting state synchronously in an effect.
  const [result, setResult] = useState<{ key: string; posts: Post[] } | null>(null);
  const [reloads, setReloads] = useState(0);
  const [query, setQuery] = useState("");
  const [communities, setCommunities] = useState<{ mine: Community[]; popular: Community[] } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [composerIntent, setComposerIntent] = useState<DiscussIntent>("ask");
  const [createOpen, setCreateOpen] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [signInAction, setSignInAction] = useState("post");

  const key = `${sort}:${reloads}`;
  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    (sort === "trending"
      ? getTrending(0, 50).then((all) => all.filter((p) => p.intentType === "ask" || p.intentType === "update" || p.intentType === "offer"))
      : getThreads({ sort, size: 50 })
    )
      .catch(() => [] as Post[])
      .then((threads) => !cancelled && setResult({ key, posts: threads }));
    return () => {
      cancelled = true;
    };
  }, [router, sort, key]);
  const posts = result?.key === key ? result.posts : null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCommunities().catch(() => []), getSession() ? myCommunities().catch(() => []) : Promise.resolve([] as Community[])]).then(
      ([all, mine]) => {
        if (cancelled) return;
        const mineIds = new Set(mine.map((c) => c.id));
        setCommunities({ mine, popular: all.filter((c) => !mineIds.has(c.id)).slice(0, 8) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloads]);

  // Typing searches every discussion on Arena (GET /search), not just the ones loaded here.
  const searchKey = query.trim().toLowerCase();
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
      setSignInAction("post");
      setSignInPromptOpen(true);
      return;
    }
    setComposerIntent(intent);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  function startCommunity() {
    if (!getSession()) {
      setSignInAction("start a community");
      setSignInPromptOpen(true);
      return;
    }
    setCreateOpen(true);
  }

  const chips = communities ? [...communities.mine, ...communities.popular] : [];

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

        {/* Communities - yours first, then the most joined. */}
        <section aria-label="Communities" className="mb-5">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Communities</h2>
            <Link href="/discuss/communities" className="flex items-center gap-0.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
              Browse all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {communities === null
              ? [0, 1, 2, 3].map((i) => <div key={i} className="h-9 w-32 shrink-0 animate-pulse rounded-full bg-card" />)
              : chips.map((c) => (
                  <Link
                    key={c.id}
                    href={`/discuss/c/${c.slug}`}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors hover:bg-secondary",
                      c.viewerRole ? "border-ring/50 bg-card text-foreground" : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    <span aria-hidden>{c.emoji}</span> {c.name}
                  </Link>
                ))}
            <button
              type="button"
              onClick={startCommunity}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" /> New community
            </button>
          </div>
        </section>

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
          {!searching && (
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
          )}
        </div>

        {visible === null ? (
          <OrbLoader className="h-48" />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium">{searching ? "No discussions match that" : "No threads yet"}</p>
            <p className="text-[13px] text-muted-foreground">
              {searching ? "Try different words, or start the thread yourself." : "Ask something or share something to get it going."}
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
      <CreateCommunityDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c) => router.push(`/discuss/c/${c.slug}`)} />
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action={signInAction} />
    </AppShell>
  );
}
