"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareReply, Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { getComments, addComment, deleteComment } from "@/lib/api/posts";
import { formatTimeAgo } from "@/lib/format";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { PostComment } from "@/lib/types";

// Replies nest visually up to this depth; deeper replies still thread correctly but stop
// indenting, so a long back-and-forth stays readable on a phone.
const MAX_INDENT = 4;

type Node = { comment: PostComment; replies: Node[] };

function buildTree(comments: PostComment[]): Node[] {
  const byId = new Map<string, Node>();
  comments.forEach((c) => byId.set(c.id, { comment: c, replies: [] }));
  const roots: Node[] = [];
  comments.forEach((c) => {
    const node = byId.get(c.id)!;
    const parent = c.parentCommentId ? byId.get(c.parentCommentId) : undefined;
    // A reply whose parent isn't in this batch (e.g. past the 200-comment window) still shows,
    // just at the top level rather than disappearing.
    (parent ? parent.replies : roots).push(node);
  });
  return roots;
}

function ReplyBox({
  onSubmit,
  onCancel,
  autoFocus,
  placeholder,
  anonymousMode,
}: {
  onSubmit: (text: string, anonymous: boolean) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder: string;
  /** "choice" = show the anonymous switch; "forced" = always anonymous (your own anonymous post). */
  anonymousMode?: "choice" | "forced";
}) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim() || posting) return;
          setPosting(true);
          setError(null);
          try {
            await onSubmit(draft.trim(), anonymousMode === "forced" || anonymous);
            setDraft("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't post that reply.");
          } finally {
            setPosting(false);
          }
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onKeyDown={(e) => e.key === "Escape" && onCancel?.()}
          className="border-border bg-white/[0.03] text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || posting}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="size-4" />
        </button>
      </form>
      {anonymousMode === "choice" && (
        <label className="flex w-fit cursor-pointer items-center gap-1.5 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-3.5 accent-[var(--primary)]" />
          🎭 Reply anonymously
        </label>
      )}
      {anonymousMode === "forced" && <p className="text-[12px] text-muted-foreground">🎭 Your replies here stay anonymous, like your post.</p>}
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C - comments on every post type. Phase 2 (Discuss):
// threaded - any comment can be replied to, and replies nest under it. Deletable by the
// comment's own author or the post's author, mirroring the backend's permission check; a deleted
// comment that still has replies stays as "[deleted]" so the replies keep their context.
export function CommentThread({
  postId,
  postAuthorUserId,
  anonymousMode,
}: {
  postId: string;
  postAuthorUserId: string;
  /** Discuss threads: "choice" offers anonymous replies; "forced" when it's your own anonymous post. */
  anonymousMode?: "choice" | "forced";
}) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const myUserId = getSession()?.candidateId;

  const load = () => {
    getComments(postId).then(setComments);
  };
  useEffect(load, [postId]);

  const tree = useMemo(() => (comments ? buildTree(comments) : null), [comments]);
  const liveCount = comments?.filter((c) => !c.deleted).length ?? 0;

  async function post(text: string, anonymous: boolean, parentId?: string) {
    // The post itself is viewable logged-out; commenting still needs an account.
    if (!getSession()) {
      setSignInPromptOpen(true);
      return;
    }
    await addComment(postId, text, parentId, anonymous);
    setReplyingTo(null);
    load();
  }

  async function remove(commentId: string) {
    await deleteComment(postId, commentId);
    load();
  }

  function renderNode(node: Node, depth: number) {
    const c = node.comment;
    // `mine` comes from the server, so it's right even for your own anonymous replies.
    const canDelete = !c.deleted && (c.mine || myUserId === c.authorUserId || (!!myUserId && myUserId === postAuthorUserId));
    const linkable = !c.deleted && !c.anonymous && !!c.authorUserId;
    return (
      <div key={c.id} className={cn(depth > 0 && depth <= MAX_INDENT && "ml-3 border-l border-border pl-3 sm:ml-4 sm:pl-4")}>
        <div className="flex items-start gap-2.5 py-1.5">
          {c.deleted ? (
            <span className="mt-0.5 size-6 shrink-0 rounded-full bg-secondary" aria-hidden />
          ) : linkable ? (
            <Link href={`/people/${c.authorUserId}`} className="text-base leading-6">
              {c.authorEmoji}
            </Link>
          ) : (
            <span className="text-base leading-6">{c.authorEmoji}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[12px]">
              {c.deleted ? (
                <span className="text-muted-foreground">[deleted]</span>
              ) : linkable ? (
                <Link href={`/people/${c.authorUserId}`} className="font-semibold text-foreground hover:underline">
                  {c.authorName}
                </Link>
              ) : (
                <span className="font-semibold text-foreground">{c.authorName}</span>
              )}
              {!c.deleted && c.op && <span className="rounded bg-primary/15 px-1.5 py-px text-[10px] font-bold text-primary-soft">OP</span>}
              {!c.deleted && c.mine && c.anonymous && <span className="text-[11px] text-muted-foreground">(you)</span>}
              <span className="text-muted-foreground">{formatTimeAgo(c.createdAt)}</span>
            </div>
            {!c.deleted && <p className="mt-0.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground/90">{c.content}</p>}
            {!c.deleted && (
              <div className="mt-1 flex items-center gap-3 text-[12px] text-muted-foreground">
                <button type="button" onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} className="flex items-center gap-1 hover:text-foreground">
                  <MessageSquareReply className="size-3.5" /> Reply
                </button>
                {canDelete && (
                  <button type="button" onClick={() => remove(c.id)} className="flex items-center gap-1 hover:text-red-400">
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                )}
              </div>
            )}
            {replyingTo === c.id && (
              <div className="mt-2">
                <ReplyBox
                  autoFocus
                  placeholder={`Reply to ${c.authorName}…`}
                  anonymousMode={anonymousMode}
                  onSubmit={(t, anon) => post(t, anon, c.id)}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        </div>
        {node.replies.map((r) => renderNode(r, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ReplyBox placeholder="Add to the discussion…" anonymousMode={anonymousMode} onSubmit={(t, anon) => post(t, anon)} />

      {tree === null ? (
        <p className="text-xs text-muted-foreground">Loading replies…</p>
      ) : liveCount === 0 && tree.length === 0 ? (
        <p className="text-xs text-muted-foreground">No replies yet - be the first.</p>
      ) : (
        <div className="space-y-1">{tree.map((n) => renderNode(n, 0))}</div>
      )}
      <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="reply" />
    </div>
  );
}
