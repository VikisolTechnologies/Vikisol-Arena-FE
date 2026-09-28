"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { DashShell } from "@/components/dash/DashShell";
import NotFound from "@/app/not-found";
import { signOut } from "@/lib/api/auth";
import { getSession } from "@/lib/session";

/** HM4: hiring_manager gets no pipeline/search/postings/unlocks - just this one shell around
 * "My interviews" and whichever specific interview room they're assigned to. Same mount-flag
 * guard pattern as CompanyAdminShell (state starts false on both server and client, only flips
 * inside an effect - a lazy `typeof window` initializer here caused a real hydration mismatch
 * the first time it was tried on CompanyAdminShell, see that component's comment). */
export function HiringManagerShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "denied">("checking");

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/auth"); return; }
    // ARENA-INVENTORY-FIXES.md FIX 2 - was router.replace("/dashboard"), which bounced any
    // non-HM session (retired route -> its own requireOnboarded() check) into the candidate
    // onboarding wizard. Renders the branded 404 in place instead, same pattern as
    // PlatformAdminShell/CompanyAdminShell.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate client-only auth gate flip
    setState(session.role === "hiring_manager" ? "ready" : "denied");
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (state === "checking") return null;
  if (state === "denied") return <NotFound />;

  return (
    <DashShell product="Business" nav={[{ href: "/enterprise/interviews/mine", label: "My interviews", icon: CalendarClock, match: ["/enterprise/interviews/mine"] }]} title={title} actions={actions} onLogout={handleLogout}>
      {children}
    </DashShell>
  );
}
