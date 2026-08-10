"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useIsMobileViewport } from "@/hooks/use-is-mobile-viewport";
import { useAgentState, setAgentState } from "@/lib/agentState";
import { agentRealtime } from "@/lib/realtime";
import { cn } from "@/lib/utils";

const OrbScene = dynamic(() => import("./OrbScene").then((m) => m.OrbScene), { ssr: false });

// MOBILE-PERF-BASELINE.md: this Canvas's own vendor chunk (three/@react-three/fiber/drei) is
// ~876KB - correctly code-split away from every route's initial bundle already, but the
// dynamic import used to fire the instant this component mounted, i.e. immediately once the
// authenticated shell renders, landing squarely in the same window the page's own data fetch
// is competing for bandwidth in. Deferring the mount to next idle (with a timeout fallback for
// browsers with no requestIdleCallback) doesn't change the scene itself at all - full 3D,
// same quality tiering, same everything - it only changes *when* the browser goes and fetches
// it, so it stops racing the content the user is actually there to see.
function useIdleReady(timeoutMs = 1200) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(id);
  }, [timeoutMs]);
  return ready;
}

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
  // ARENA-PERFORMANCE.md non-negotiable: the 3D stays everywhere, desktop and mobile - no
  // permanent static fallback keyed off viewport/device. Mobile/low-power gets the same scene
  // at a cheaper quality tier (see OrbScene's `quality` prop) instead of losing it outright.
  // prefers-reduced-motion is the only thing that swaps to the static CSS disc, since that's an
  // explicit accessibility signal, not a capability guess.
  const isMobile = useIsMobileViewport();
  const state = useAgentState();
  const pathname = usePathname();
  const sceneReady = useIdleReady();

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
        "border border-border bg-card backdrop-blur-md transition-transform hover:scale-105 sm:right-7",
      )}
      // ARENA-DESIGN-SYSTEM.md kill list: "zero neon orange in the product" - this shadow was a
      // literal Vikisol-orange rgba, not a token, so it rendered as an orange glow on every
      // migrated (ivory) screen regardless of theme. Swapped to --gold (matches the same fix
      // applied to the marketplace bid-highlight and Button's primary-gradient shadow elsewhere
      // this pass) so the "needs approval" urgency signal reads as gold, not orange.
      style={{
        boxShadow:
          state === "needs-approval"
            ? "0 0 0 3px rgba(214,168,79,0.28), 0 8px 30px rgba(214,168,79,0.5)"
            : "0 8px 24px rgba(0,0,0,0.16)",
      }}
    >
      {state === "needs-approval" && !reduced && (
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/30" />
      )}
      {state === "needs-approval" && (
        <span className="absolute -right-0.5 -top-0.5 z-10 size-3.5 rounded-full border-2 border-background bg-primary" />
      )}
      {reduced || !sceneReady ? (
        // Same static disc doubles as the pre-idle placeholder, not just the reduced-motion
        // fallback - the 3D scene still always arrives (full quality tiering intact), just a
        // beat later, once the browser's had a chance to get the actual feed content on screen
        // first. See useIdleReady's own comment.
        <span
          className="size-9 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #FF8A5B, #FF6B35 70%)" }}
        />
      ) : (
        <div className="size-11">
          <OrbScene state={state} cameraDistance={2.6} quality={isMobile ? "lite" : "full"} />
        </div>
      )}
    </Link>
  );
}
