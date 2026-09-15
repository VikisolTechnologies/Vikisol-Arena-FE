"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrbLoader } from "@/components/ui/orb-loader";

// SCREEN 5 "INBOX" - "There is exactly one messaging surface in the app." The merged list now
// lives at /rooms; this route stays only so the one external "message this person" link
// (enterprise/talent/[id]) and any bookmarked /messages URL keep working, forwarding straight
// into the real merged Inbox instead of the old, now-removed standalone Messages screen.
function MessagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");

  useEffect(() => {
    router.replace(withParam ? `/rooms?with=${withParam}` : "/rooms");
  }, [router, withParam]);

  return null;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<OrbLoader className="h-96" />}>
      <MessagesRedirect />
    </Suspense>
  );
}
