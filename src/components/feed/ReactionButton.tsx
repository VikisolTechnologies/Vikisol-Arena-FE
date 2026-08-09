"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { reactToPost, unreactToPost } from "@/lib/api/posts";
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

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !myReacted;
    setMyReacted(next);
    setReactionCount((c) => c + (next ? 1 : -1));
    try {
      await (next ? reactToPost(postId) : unreactToPost(postId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("flex items-center gap-1 text-xs transition-colors", myReacted ? "text-primary-soft" : "text-muted-foreground hover:text-foreground", className)}
      aria-label={myReacted ? "Remove reaction" : "React"}
    >
      <Heart className={cn("size-3.5", myReacted && "fill-current")} /> {reactionCount > 0 ? reactionCount : ""}
    </button>
  );
}
