"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, HelpCircle, PenLine, Settings2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreateComposer } from "@/components/create-v3/CreateComposer";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { ThreadRow } from "@/components/discuss/ThreadRow";
import {
  getCommunity,
  getModerators,
  getThreads,
  joinCommunity,
  leaveCommunity,
  removeCommunityPost,
  setModerator,
  updateCommunity,
  type ThreadSort,
} from "@/lib/api/communities";
import { allowGuestBrowsing } from "@/lib/auth-guard";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Community, CommunityMember, Post } from "@/lib/types";

/** One Discuss community: its threads (New/Top), membership, and owner/moderator tools. */
export default function CommunityPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const [community, setCommunity] = useState<Community | null | undefined>(undefined);
  const [mods, setMods] = useState<CommunityMember[]>([]);
  const [sort, setSort] = useState<ThreadSort>("new");
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<{ key: string; posts: Post[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSession, setComposerSession] = useState(0);
  const [composerIntent, setComposerIntent] = useState<"ask" | "update">("ask");
  const [signInOpen, setSignInOpen] = useState(false);
  const [removing, setRemoving] = useState<Post | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editAnonymous, setEditAnonymous] = useState(true);

  useEffect(() => {
    if (!allowGuestBrowsing(router)) return;
    let cancelled = false;
    getCommunity(slug)
      .then((c) => !cancelled && setCommunity(c))
      .catch(() => !cancelled && setCommunity(null));
    getModerators(slug)
      .then((m) => !cancelled && setMods(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router, slug, reloads]);

  const key = `${slug}:${sort}:${reloads}`;
  useEffect(() => {
    let cancelled = false;
    getThreads({ community: slug, sort, size: 50 })
      .catch(() => [] as Post[])
      .then((posts) => !cancelled && setResult({ key, posts }));
    return () => {
      cancelled = true;
    };
  }, [slug, sort, key]);
  const posts = result?.key === key ? result.posts : null;

  const role = community?.viewerRole ?? null;
  const canModerate = role === "owner" || role === "moderator";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setReloads((n) => n + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "That didn't work - try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMembership() {
    if (!getSession()) {
      setSignInOpen(true);
      return;
    }
    run(() => (role ? leaveCommunity(slug) : joinCommunity(slug)));
  }

  function start(intent: "ask" | "update") {
    if (!getSession()) {
      setSignInOpen(true);
      return;
    }
    setComposerIntent(intent);
    setComposerSession((n) => n + 1);
    setComposerOpen(true);
  }

  if (community === undefined) {
    return (
      <AppShell title="Discuss">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }
  if (community === null) {
    return (
      <AppShell title="Discuss">
        <div className="mx-auto max-w-[680px] rounded-2xl border border-border bg-card p-8 text-center">
          <p className="mb-2 text-[15px] font-medium">This community doesn&apos;t exist</p>
          <Link href="/discuss/communities" className="text-[13px] text-muted-foreground underline">
            Browse communities
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={community.name}>
      <div className="mx-auto w-full max-w-[780px]">
        <Link href="/discuss" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Discuss
        </Link>

        <header className="mb-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-[30px]">{community.emoji}</span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[22px] font-semibold leading-tight text-foreground">{community.name}</h1>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {community.memberCount} member{community.memberCount === 1 ? "" : "s"} · {community.postCount} thread{community.postCount === 1 ? "" : "s"}
                {community.allowAnonymous && " · anonymous posts allowed"}
              </p>
            </div>
          </div>
          {community.description && <p className="mt-3 text-[14px] leading-relaxed text-foreground/90">{community.description}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {community.viewerBanned ? (
              <p className="text-[13px] text-red-400">You&apos;ve been removed from this community.</p>
            ) : role === "owner" ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[12px] font-semibold text-primary-soft">
                  <ShieldCheck className="size-3.5" /> You own this community
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setEditDescription(community.description ?? "");
                    setEditAnonymous(community.allowAnonymous);
                    setEditing(true);
                  }}
                >
                  <Settings2 className="size-3.5" /> Edit
                </Button>
              </>
            ) : (
              <Button size="sm" variant={role ? "outline" : "default"} disabled={busy} onClick={toggleMembership}>
                {role ? "Joined ✓ - Leave" : "Join"}
              </Button>
            )}
            {!community.viewerBanned && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start("ask")}>
                  <HelpCircle className="size-3.5" /> Ask
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => start("update")}>
                  <PenLine className="size-3.5" /> Share
                </Button>
              </>
            )}
          </div>
          {actionError && <p className="mt-2 text-[12px] text-red-400">{actionError}</p>}

          {mods.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Run by</p>
              <div className="flex flex-wrap gap-2">
                {mods.map((m) => (
                  <span key={m.userId} className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px]">
                    <Link href={`/people/${m.userId}`} className="hover:underline">
                      {m.emoji} {m.name}
                    </Link>
                    <span className="text-muted-foreground">· {m.role}</span>
                    {role === "owner" && m.role === "moderator" && (
                      <button type="button" disabled={busy} onClick={() => run(() => setModerator(slug, m.userId, false))} className="text-muted-foreground hover:text-red-400">
                        remove
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {role === "owner" && (
                <p className="mt-2 text-[11px] text-muted-foreground">To add a moderator, open one of their posts here and choose &ldquo;Make moderator&rdquo;.</p>
              )}
            </div>
          )}
        </header>

        <div role="tablist" aria-label="Sort" className="mb-3 inline-flex gap-1 rounded-full border border-border bg-card p-1">
          {(["new", "top"] as ThreadSort[]).map((s) => (
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

        {posts === null ? (
          <OrbLoader className="h-48" />
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <p className="mb-2 text-[15px] font-medium">No threads here yet</p>
            <p className="text-[13px] text-muted-foreground">Start the first one - ask a question or share something.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {posts.map((p) => (
              <ThreadRow
                key={p.id}
                post={p}
                showCommunity={false}
                onRemove={canModerate ? (post) => { setRemoveReason(""); setRemoving(post); } : undefined}
              />
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
        initialCommunity={community}
      />

      {/* Moderator: remove a thread, with an optional reason the author will see. */}
      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this thread?</DialogTitle>
            <DialogDescription>It disappears from {community.name} and from Discuss. The author can still see it with your reason.</DialogDescription>
          </DialogHeader>
          <Input value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} maxLength={200} placeholder="Reason (optional) - e.g. off-topic, spam" className="border-border bg-card" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => {
                const post = removing;
                setRemoving(null);
                if (post) run(() => removeCommunityPost(slug, post.id, removeReason.trim() || undefined));
              }}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner: edit the description and whether anonymous posts are allowed. */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="border-border bg-popover sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {community.name}</DialogTitle>
            <DialogDescription>The name stays the same so links to it keep working.</DialogDescription>
          </DialogHeader>
          <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} maxLength={500} rows={4} className="border-border bg-card" />
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={editAnonymous} onChange={(e) => setEditAnonymous(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Let members post anonymously
          </label>
          <Button
            disabled={busy}
            onClick={() => {
              setEditing(false);
              run(() => updateCommunity(slug, { description: editDescription, allowAnonymous: editAnonymous }));
            }}
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>

      <SignInPrompt open={signInOpen} onOpenChange={setSignInOpen} action="join the conversation" />
    </AppShell>
  );
}
