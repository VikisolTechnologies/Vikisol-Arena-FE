"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { useAgentState, setAgentState } from "@/lib/agentState";
import { agentRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const OrbScene = dynamic(() => import("./OrbScene").then((m) => m.OrbScene), { ssr: false });

const STATE_LABEL: Record<string, string> = {
  idle: "Agent — idle. Open agent chat",
  thinking: "Agent is thinking. Open agent chat",
  acting: "Agent is working. Open agent chat",
  "needs-approval": "Agent needs your approval. Open agent chat",
};

/** Persistent mini-orb, mounted in both app shells. Reflects the same global agent
 * state the full /agent orb does, and flashes "acting" whenever the simulated realtime
 * feed emits — so it reads as alive on every screen, not just while chatting.
 * Hidden on /agent itself, which owns a full-size orb tied to the same state. */
export function PersistentOrb() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobileViewport();
  // This orb stays mounted (and its WebGL scene actively rendering) for as long as a candidate
  // is signed in, across every page - unlike the landing page's hero orb (a one-time, prominent
  // visual), a continuous render loop is a disproportionate battery/GPU cost for a 44px
  // decorative floating button, especially on mobile. Distinct from the reduced-motion check
  // alone: this isn't about the user's animation preference, it's about not running a live 3D
  // scene in the background of every screen on a phone.
  const skipLiveOrb = reduced || isMobile;
  const state = useAgentState();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/agent") return; // the full orb on that page owns state directly
    return agentRealtime.subscribe(() => {
      setAgentState("acting", { autoRevertMs: 2600 });
    });
  }, [pathname]);

  if (pathname === "/agent") return null;

  return (
    <Link
      href="/agent"
      aria-label={STATE_LABEL[state]}
      title={STATE_LABEL[state]}
      className={cn(
        "fixed bottom-6 right-5 z-30 flex size-15 items-center justify-center rounded-full",
        "border border-border bg-white/[0.04] backdrop-blur-md transition-transform hover:scale-105 sm:right-7",
      )}
      style={{
        boxShadow:
          state === "needs-approval"
            ? "0 0 0 3px rgba(255,107,53,0.28), 0 8px 30px rgba(255,107,53,0.5)"
            : "0 8px 24px rgba(255,107,53,0.28)",
      }}
    >
      {state === "needs-approval" && !reduced && (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
      )}
      {state === "needs-approval" && (
        <span className="absolute -right-0.5 -top-0.5 z-10 size-3.5 rounded-full border-2 border-background bg-primary" />
      )}
      {skipLiveOrb ? (
        <span
          className="size-9 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #FF8A5B, #FF6B35 70%)" }}
        />
      ) : (
        <div className="size-11">
          <OrbScene state={state} cameraDistance={2.6} />
        </div>
      )}
    </Link>
  );
}
