"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { followCompany, unfollowCompany } from "@/lib/api/companies";
import { getSession } from "@/lib/session";

export function CompanyFollowButton({ companyId, initialFollowing, className }: { companyId: string; initialFollowing: boolean; className?: string }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // MOBILE-PERF-BASELINE.md: optimistic, same as FollowButton/ReactionButton - reverts on failure.
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // ARENA-INVENTORY-FIXES.md FIX 1 - /companies/[id] now renders logged-out; a visitor
    // without an account gets the sign-in prompt instead of a follow call that would 401.
    if (!getSession()) { setPromptOpen(true); return; }
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      await (next ? followCompany(companyId) : unfollowCompany(companyId));
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant={following ? "outline" : "default"}
        size="sm"
        className={`gap-1.5 ${className ?? ""}`}
        disabled={busy}
        onClick={toggle}
      >
        {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
        {following ? "Following" : "Follow"}
      </Button>
      <SignInPrompt open={promptOpen} onOpenChange={setPromptOpen} action="follow companies" />
    </>
  );
}
