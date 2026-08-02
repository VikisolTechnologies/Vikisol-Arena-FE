"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { MessagesInbox } from "@/components/messages/MessagesInbox";
import { getMyProfile } from "@/lib/api/profile";
import { getSession, isOnboarded } from "@/lib/session";
import type { CandidateProfile } from "@/lib/types";

export default function MessagesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!getSession()) { router.replace("/auth"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    getMyProfile().then(setProfile);
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Messages">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Messages" profile={profile}>
      <Suspense fallback={<OrbLoader className="h-96" />}>
        <MessagesInbox />
      </Suspense>
    </CandidateAppShell>
  );
}
