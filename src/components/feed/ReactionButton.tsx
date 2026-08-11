"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { reactToPost, unreactToPost } from "@/lib/api/posts";
import { getSession } from "@/lib/session";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { cn } from "@/lib/utils";

export function ReactionButton({
  postId, reacted, count, className,
}: {
  postId: string;
  reacted: boolean;
  count: number;
  className?: string;
}) {
  const [myReacted, setMyReacted] = useState(reacted);
  const [reactionCount, setReactionCount] = useState(count);
  const [busy, setBusy] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    // ARENA-STABILIZE.md Phase 2, G9 - this used to just optimistically flip and silently
    // revert on the inevitable 401 for a logged-out viewer, with no explanation. Same sign-in
    // prompt treatment as every other account-only action on this now-public post page.
    if (!getSession()) { setSignInPromptOpen(true); return; }
    setBusy(true);
    const next = !myReacted;
    setMyReacted(next);
    setReactionCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? reactToPost(postId) : unreactToPost(postId));
    } catch {
      setMyReacted(!next);
      setReactionCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <button
      type="button"
      onClick={toggle}
      // ARENA-PERF-AND-MOBILE-FIX.md Track A - the visible icon+count stays small (matches the
      // rest of the card footer), but the tappable area expands to ~44px via this invisible
      // pseudo-element hit-area rather than adding real padding that would bulk up the row.
      className={cn(
        "relative flex items-center gap-1 text-xs transition-colors before:absolute before:inset-[-13px] before:content-['']",
        myReacted ? "text-primary-soft" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={myReacted ? "Remove reaction" : "React"}
    >
      <Heart className={cn("size-3.5", myReacted && "fill-current")} /> {reactionCount > 0 ? reactionCount : ""}
    </button>
    <SignInPrompt open={signInPromptOpen} onOpenChange={setSignInPromptOpen} action="react to posts" />
    </>
  );
}
