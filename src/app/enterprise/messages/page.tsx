"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EnterpriseAppShell } from "@/components/app/EnterpriseAppShell";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { getMyEnterpriseProfile } from "@/lib/api/enterprise";
import { getSession, isEnterpriseOnboarded } from "@/lib/session";
import type { EnterpriseProfile } from "@/lib/types";

export default function EnterpriseMessagesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EnterpriseProfile | null>(null);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isEnterpriseOnboarded()) { router.replace("/enterprise/onboarding"); return; }
    getMyEnterpriseProfile().then(setProfile);
  }, [router]);

  if (!profile) {
    return (
      <EnterpriseAppShell title="Messages">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </EnterpriseAppShell>
    );
  }

  return (
    <EnterpriseAppShell title="Messages" profile={profile}>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <MessagesInbox />
      </Suspense>
    </EnterpriseAppShell>
  );
}
