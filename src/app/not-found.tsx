"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AuraBackground } from "@/components/landing/AuraBackground";
import { AgentOrb } from "@/components/landing/AgentOrb";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const Animator = dynamic(() => import("@/components/NotFoundBeamAnimator").then((m) => m.NotFoundBeamAnimator), {
  ssr: false,
});

// ARENA-INVENTORY-FIXES.md FIX 2 - was a hardcoded "Dashboard" -> /dashboard, a route ROUTES.md
// itself calls fully retired. Now rendered both for genuine 404s and (via /access-denied) for
// wrong-role access, so it needs to send someone somewhere that's actually theirs rather than a
// dead link every single time. /workspace and /hm/interviews are PART 15's not-yet-built v3
// names (ROUTES.md) - using today's real routes instead so this never points at another 404.
const ROLE_LANDING: Record<Role, string> = {
  talent: "/home",
  recruiter: "/enterprise/dashboard",
  company_admin: "/enterprise/dashboard",
  hiring_manager: "/enterprise/interviews/mine",
  platform_admin: "/admin",
};

export default function NotFound() {
  const beamRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // A genuinely-unmatched URL (or a hard load of /access-denied) is real SSR + hydration, not a
  // client-side transition - reading getSession() straight into render would return null on the
  // server and the real session on the client, the exact hydration-mismatch class CandidateAppShell
  // already hit and fixed once (see its own comment). Starts at the session-less default on both
  // server and first client paint, only flips after the effect below runs post-hydration.
  const [secondary, setSecondary] = useState<{ href: string; label: string }>({ href: "/auth", label: "Sign in" });

  useEffect(() => {
    document.title = "Lost in the universe — Arena";
    const session = getSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only auth-gate flip
    if (session) setSecondary({ href: ROLE_LANDING[session.role], label: "Take me back" });
  }, []);

  return (
    <div className="relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-5 text-center text-foreground">
      <AuraBackground />
      <div className="relative z-10">
        <div className="relative mx-auto scale-75">
          <div
            ref={beamRef}
            aria-hidden
            className="pointer-events-none absolute inset-[-40%] opacity-40"
            style={{ background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,138,91,0.25) 20deg, transparent 40deg)" }}
          />
          <AgentOrb />
          {!reduced && <Animator beamRef={beamRef} />}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">This page isn&apos;t in my database.</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Want me to find you something better?</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost-glass" size="cta" render={<Link href="/" />} nativeButton={false}>Home</Button>
          <Button variant="primary-gradient" size="cta" render={<Link href={secondary.href} />} nativeButton={false}>{secondary.label}</Button>
        </div>
      </div>
    </div>
  );
}
