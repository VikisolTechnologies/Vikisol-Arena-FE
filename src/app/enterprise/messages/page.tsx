"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { Skeleton } from "@/components/bplus/Primitives";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import { requireEnterpriseOnboarded } from "@/lib/auth-guard";
import type { EnterpriseProfile } from "@/lib/types";

/** Arena for Business — Messages. Same guard and API; B+ inbox. */
export default function EnterpriseMessagesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);

  useEffect(() => {
    if (!requireEnterpriseOnboarded(router)) return;
    getMyEnterpriseProfile().then(setProfile).catch(() => {});
  }, [router]);

  return (
    <EnterpriseAppShell title="Messages" profile={profile}>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MessagesInbox />
      </Suspense>
    </EnterpriseAppShell>
  );
}
