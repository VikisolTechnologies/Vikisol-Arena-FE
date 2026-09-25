"use client";

import Link from "next/link";
import { MessageCircle, ShieldOff } from "lucide-react";
import { DemoContentBadge } from "@/components/home-v3/DemoContentBadge";
import { PostMedia } from "@/components/posts/PostMedia";
import { VoteControl } from "@/components/posts/VoteControl";
import { formatTimeAgo } from "@/lib/format";
import type { Post } from "@/lib/types";

const KIND_LABEL: Record<string, string> = { ask: "Question", update: "Update" };

/**
 * One Discuss thread in a list. Media sits between two links rather than inside one (tapping a
 * video must play it), and voting sits outside the links for the same reason.
 * `showCommunity` - false on a community's own page, where naming it on every row is noise.
 * `onRemove` - only passed for that community's owner/moderators.
 */
export function ThreadRow({ post, showCommunity = true, onRemove }: { post: Post; showCommunity?: boolean; onRemove?: (post: Post) => void }) {
  const text = post.title || post.body;
  const href = `/feed/${post.id}`;
  return (
    <article className="rounded-2xl border border-border bg-card px-4 py-4 transition-colors hover:bg-secondary/40">
      {showCommunity && post.communitySlug && (
        <Link href={`/discuss/c/${post.communitySlug}`} className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground hover:underline">
          <span aria-hidden>{post.communityEmoji}</span> {post.communityName}
        </Link>
      )}
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
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(post)}
            className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-1.5 hover:bg-secondary hover:text-red-400"
          >
            <ShieldOff className="size-3.5" /> Remove
          </button>
        )}
      </div>
    </article>
  );
}
