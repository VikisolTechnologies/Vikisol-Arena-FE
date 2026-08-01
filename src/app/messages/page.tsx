"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
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
        <div className="h-96 animate-pulse rounded-2xl bg-white/5" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Messages" profile={profile}>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white/5" />}>
        <MessagesInbox />
      </Suspense>
    </CandidateAppShell>
  );
}
