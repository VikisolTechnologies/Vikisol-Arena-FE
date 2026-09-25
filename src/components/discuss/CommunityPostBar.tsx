"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ShieldCheck, ShieldOff } from "lucide-react";
import { banPostAuthor, getCommunity, removeCommunityPost, setModerator } from "@/lib/api/communities";
import { getSession } from "@/lib/session";
import type { Community, Post } from "@/lib/types";

/**
 * On a thread that lives in a community: which community (linked), and - only for that
 * community's owner/moderators - the tools to remove the thread, ban its author, or (owner only)
 * make the author a moderator. Renders nothing for a thread outside any community.
 */
export function CommunityPostBar({ post }: { post: Post }) {
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const slug = post.communitySlug;

  useEffect(() => {
    if (!slug || !getSession()) return;
    let cancelled = false;
    getCommunity(slug)
      .then((c) => !cancelled && setCommunity(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) return null;
  const role = community?.viewerRole;
  const canModerate = role === "owner" || role === "moderator";
  const isAuthor = post.mine || getSession()?.candidateId === post.authorUserId;

  async function run(action: () => Promise<unknown>, done: string, then?: () => void) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
      then?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <Link href={`/discuss/c/${slug}`} className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-foreground hover:bg-secondary">
        <span aria-hidden>{post.communityEmoji}</span> {post.communityName}
      </Link>
      {canModerate && !isAuthor && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[12px]">
          <span className="text-muted-foreground">Moderator:</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => removeCommunityPost(slug, post.id), "Removed.", () => router.push(`/discuss/c/${slug}`))}
            className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-secondary hover:text-red-400"
          >
            <ShieldOff className="size-3.5" /> Remove thread
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => banPostAuthor(slug, post.id), `${post.authorName} can no longer post in ${post.communityName}.`)}
            className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-secondary hover:text-red-400"
          >
            <Ban className="size-3.5" /> Ban author
          </button>
          {role === "owner" && !post.anonymous && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => setModerator(slug, post.authorUserId, true), `${post.authorName} is now a moderator.`)}
              className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-secondary hover:text-foreground"
            >
              <ShieldCheck className="size-3.5" /> Make moderator
            </button>
          )}
          {message && <span className="w-full text-muted-foreground">{message}</span>}
        </div>
      )}
    </div>
  );
}
