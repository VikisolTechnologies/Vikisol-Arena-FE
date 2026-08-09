"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getComments, addComment, deleteComment } from "@/lib/api/posts";
import { formatFriendlyDateTime } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { PostComment } from "@/lib/types";

// ARENA-V2-PRODUCT-ARCHITECTURE.md Phase C - comments on every post type, not gated to UPDATE
// posts (see DECISIONS.md). Deletable by the comment's own author or the post's author, mirroring
// the backend's exact permission check.
export function CommentThread({ postId, postAuthorUserId }: { postId: string; postAuthorUserId: string }) {
  const router = useRouter();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const myUserId = getSession()?.candidateId;

  const load = () => { getComments(postId).then(setComments); };
  useEffect(load, [postId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || posting) return;
    setPosting(true);
    try {
      await addComment(postId, draft.trim());
      setDraft("");
      load();
    } finally {
      setPosting(false);
    }
  };

  const remove = async (commentId: string) => {
    await deleteComment(postId, commentId);
    load();
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment..."
          className="border-border bg-white/[0.03] text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || posting}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          aria-label="Post comment"
        >
          <Send className="size-4" />
        </button>
      </form>

      {comments === null ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet - be the first.</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const canDelete = myUserId === c.authorUserId || myUserId === postAuthorUserId;
            return (
              <div key={c.id} className="flex items-start gap-2.5">
                <button type="button" onClick={() => router.push(`/people/${c.authorUserId}`)} className="text-base">
                  {c.authorEmoji}
                </button>
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-white/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => router.push(`/people/${c.authorUserId}`)} className="text-xs font-semibold hover:underline">
                      {c.authorName}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{formatFriendlyDateTime(c.createdAt)}</span>
                      {canDelete && (
                        <button type="button" onClick={() => remove(c.id)} aria-label="Delete comment" className="text-muted-foreground hover:text-red-400">
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/90">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
