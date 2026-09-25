"use client";

import { useState } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { votePost } from "@/lib/api/posts";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

/**
 * Up/down voting for Discuss threads. Optimistic - the score moves the moment you tap, and
 * rolls back if the server refuses. Tapping your current vote again clears it.
 */
export function VoteControl({ post, className }: { post: Post; className?: string }) {
  const [myVote, setMyVote] = useState<number>(post.myVote ?? 0);
  const [score, setScore] = useState<number>(post.score ?? post.reactionCount ?? 0);
  const [signInOpen, setSignInOpen] = useState(false);

  async function cast(direction: 1 | -1) {
    if (!getSession()) {
      setSignInOpen(true);
      return;
    }
    const next = myVote === direction ? 0 : direction;
    const prev = { myVote, score };
    setMyVote(next);
    setScore(score - myVote + next);
    try {
      await votePost(post.id, next as 1 | -1 | 0);
    } catch {
      setMyVote(prev.myVote);
      setScore(prev.score);
    }
  }

  return (
    <div className={cn("flex items-center gap-0.5 rounded-full border border-border bg-card", className)}>
      <button
        type="button"
        onClick={() => cast(1)}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        className={cn("flex size-8 items-center justify-center rounded-full hover:bg-secondary", myVote === 1 ? "text-primary" : "text-muted-foreground")}
      >
        <ArrowBigUp className="size-[18px]" fill={myVote === 1 ? "currentColor" : "none"} strokeWidth={1.75} />
      </button>
      <span className={cn("min-w-5 text-center text-[13px] font-semibold tabular-nums", myVote === 1 ? "text-primary" : myVote === -1 ? "text-sky-400" : "text-foreground")}>
        {score}
      </span>
      <button
        type="button"
        onClick={() => cast(-1)}
        aria-label="Downvote"
        aria-pressed={myVote === -1}
        className={cn("flex size-8 items-center justify-center rounded-full hover:bg-secondary", myVote === -1 ? "text-sky-400" : "text-muted-foreground")}
      >
        <ArrowBigDown className="size-[18px]" fill={myVote === -1 ? "currentColor" : "none"} strokeWidth={1.75} />
      </button>
      <SignInPrompt open={signInOpen} onOpenChange={setSignInOpen} action="vote" />
    </div>
  );
}
