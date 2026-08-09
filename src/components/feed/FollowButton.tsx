"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCounts, follow, unfollow } from "@/lib/api/follows";

export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCounts(userId).then((c) => setFollowing(!!c.viewerFollows));
  }, [userId]);

  // MOBILE-PERF-BASELINE.md: was await-then-update, meaning every click sat frozen for a full
  // round trip before the button changed at all. Flips state immediately (ReactionButton
  // already does this) and only reverts if the call genuinely fails.
  const toggle = async () => {
    if (following === null) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      await (next ? follow(userId) : unfollow(userId));
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  if (following === null) return null;

  return (
    <Button
      variant={following ? "ghost-glass" : "primary-gradient"}
      size="sm"
      className={`gap-1.5 ${className ?? ""}`}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
    >
      {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
