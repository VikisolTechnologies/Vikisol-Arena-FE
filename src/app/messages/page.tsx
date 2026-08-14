"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile } from "@/lib/types";

export default function MessagesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
  }, [router]);

  if (!profile) {
    return (
      <AppShell title="Messages">
        <OrbLoader className="h-96" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Messages" profile={profile}>
      <Suspense fallback={<OrbLoader className="h-96" />}>
        <MessagesInbox />
      </Suspense>
    </AppShell>
  );
}
