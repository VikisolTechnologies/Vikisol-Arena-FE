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

  const toggle = async () => {
    if (following === null) return;
    setBusy(true);
    try {
      if (following) {
        await unfollow(userId);
        setFollowing(false);
      } else {
        await follow(userId);
        setFollowing(true);
      }
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
