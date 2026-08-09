"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CandidateAppShell } from "@/components/app/CandidateAppShell";
import { OrbLoader } from "@/components/ui/orb-loader";
import { RoomsInbox } from "@/components/rooms/RoomsInbox";
import { getMyProfile } from "@/lib/api/profile";
import { requireOnboarded } from "@/lib/auth-guard";
import type { CandidateProfile } from "@/lib/types";

export default function RoomsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    if (!requireOnboarded(router)) return;
    getMyProfile().then(setProfile);
  }, [router]);

  if (!profile) {
    return (
      <CandidateAppShell title="Rooms">
        <OrbLoader className="h-96" />
      </CandidateAppShell>
    );
  }

  return (
    <CandidateAppShell title="Rooms" profile={profile}>
      <Suspense fallback={<OrbLoader className="h-96" />}>
        <RoomsInbox />
      </Suspense>
    </CandidateAppShell>
  );
}
