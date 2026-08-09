"use client";

import { useEffect, useState } from "react";
import { ShieldOff, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyBlocks, blockUser, unblockUser } from "@/lib/api/blocks";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §4 "report/block/mute everywhere" - a compact icon-only
// toggle deliberately with no confirm dialog, mirroring FollowButton's own no-confirmation
// reversible pattern (unblocking is just as available as blocking, one click either way).
export function BlockButton({ userId, className }: { userId: string; className?: string }) {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMyBlocks().then((blocks) => setBlocked(blocks.some((b) => b.userId === userId)));
  }, [userId]);

  // MOBILE-PERF-BASELINE.md: optimistic, same as FollowButton/ReactionButton - reverts on failure.
  const toggle = async () => {
    if (blocked === null) return;
    const next = !blocked;
    setBlocked(next);
    setBusy(true);
    try {
      await (next ? blockUser(userId) : unblockUser(userId));
    } catch {
      setBlocked(!next);
    } finally {
      setBusy(false);
    }
  };

  if (blocked === null) return null;

  return (
    <Button
      variant="ghost-glass"
      size="icon-sm"
      className={className}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      aria-label={blocked ? "Unblock this person" : "Block this person"}
      title={blocked ? "Unblock" : "Block"}
    >
      {blocked ? <ShieldX className="size-3.5 text-red-400" /> : <ShieldOff className="size-3.5" />}
    </Button>
  );
}
