"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, LogOut } from "lucide-react";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/auth"); return; }
    if (session.role !== "hiring_manager") { router.replace("/dashboard"); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate client-only auth gate flip
    setReady(true);
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  if (!ready) return null;

  return (
    <div className="relative isolate min-h-svh w-full overflow-hidden bg-background text-foreground">
      <AuraBackground />
      <nav className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/enterprise/interviews/mine" className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-wide">ARENA<span className="text-primary">.</span></span>
            <Badge variant="secondary" className="bg-white/5 text-[10px] text-muted-foreground">Hiring Manager</Badge>
          </Link>
          <div className="ml-4 hidden gap-1 sm:flex">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/12 px-3.5 py-2 text-sm font-medium text-primary-soft">
              <CalendarClock className="size-3.5" /> My interviews
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Log out" onClick={handleLogout}>
              <LogOut className="size-[18px]" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            {title && <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
