"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { CreateCommunityDialog } from "@/components/discuss/CreateCommunityDialog";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { listCommunities } from "@/lib/api/communities";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import type { Community } from "@/lib/types";

/** Every Discuss community, most joined first, with search and "start one". */
export default function CommunitiesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; communities: Community[] } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const key = query.trim().toLowerCase();
  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      listCommunities(key)
        .catch(() => [] as Community[])
        .then((communities) => !cancelled && setResult({ key, communities }));
    }, key ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, key]);
  const communities = result?.key === key ? result.communities : null;

  return (
    <AppShell title="Communities">
      <div className="mx-auto w-full max-w-[780px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/discuss" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Discuss
          </Link>
          <Button size="sm" className="gap-1.5" onClick={() => (getSession() ? setCreateOpen(true) : setSignInOpen(true))}>
            <Plus className="size-3.5" /> Start a community
          </Button>
        </div>

        <label htmlFor="community-search" className="relative mb-4 block">
          <span className="sr-only">Search communities</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="community-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a community…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        {communities === null ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium">{key ? "No community matches that" : "No communities yet"}</p>
            <p className="text-[13px] text-muted-foreground">Start one - you&apos;ll be its owner.</p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {communities.map((c) => (
              <Link key={c.id} href={`/discuss/c/${c.slug}`} className="flex gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[22px]">{c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-display text-[15px] font-semibold text-foreground">{c.name}</span>
                    {c.demoContent && <DemoContentBadge />}
                  </span>
                  {c.description && <span className="mt-0.5 block line-clamp-2 text-[12px] leading-snug text-muted-foreground">{c.description}</span>}
                  <span className="mt-1.5 block text-[11px] text-muted-foreground">
                    {c.memberCount} member{c.memberCount === 1 ? "" : "s"} · {c.postCount} thread{c.postCount === 1 ? "" : "s"}
                    {c.viewerRole && <span className="text-primary-soft"> · {c.viewerRole === "member" ? "Joined" : c.viewerRole}</span>}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateCommunityDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c) => router.push(`/discuss/c/${c.slug}`)} />
      <SignInPrompt open={signInOpen} onOpenChange={setSignInOpen} action="start a community" />
    </AppShell>
  );
}
