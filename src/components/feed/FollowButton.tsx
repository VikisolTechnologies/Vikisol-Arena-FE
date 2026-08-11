"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { getCounts, follow, unfollow } from "@/lib/api/follows";
import { getSession } from "@/lib/session";

export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // ARENA-INVENTORY-FIXES.md FIX 1 - /people/[id] now renders logged-out too. getSession() is
  // only read inside this effect (client-only, post-mount), not in the render body - reading it
  // straight into render caused a genuine SSR/hydration mismatch when tried that way elsewhere
  // in this pass (see AppShell's own comment) - and skips the authenticated fetch entirely for
  // a logged-out visitor (same class of waste as FIX 9) instead of firing a call that 401s.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only auth-gate flip
    if (!getSession()) { setFollowing(false); return; }
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
    <>
      <Button
        variant={following ? "outline" : "default"}
        size="sm"
        className={`gap-1.5 ${className ?? ""}`}
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); if (getSession()) toggle(); else setPromptOpen(true); }}
      >
        {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
        {following ? "Following" : "Follow"}
      </Button>
      <SignInPrompt open={promptOpen} onOpenChange={setPromptOpen} action="follow people" />
    </>
  );
}
