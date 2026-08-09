"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followCompany, unfollowCompany } from "@/lib/api/companies";

export function CompanyFollowButton({ companyId, initialFollowing, className }: { companyId: string; initialFollowing: boolean; className?: string }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBusy(true);
    try {
      if (following) {
        await unfollowCompany(companyId);
        setFollowing(false);
      } else {
        await followCompany(companyId);
        setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={following ? "ghost-glass" : "primary-gradient"}
      size="sm"
      className={`gap-1.5 ${className ?? ""}`}
      disabled={busy}
      onClick={toggle}
    >
      {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
