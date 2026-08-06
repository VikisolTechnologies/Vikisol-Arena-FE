"use client";

import { Canvas } from "@react-three/fiber";
import { OrbMesh } from "./OrbMesh";
import { usePageVisible } from "@/hooks/use-page-visible";
import type { AgentOrbState } from "@/lib/agentState";

/** Lightweight Canvas wrapper around OrbMesh — kept as its own module so it can be
 * next/dynamic-imported with ssr:false (WebGL has no server-side equivalent) without
 * pulling React Three Fiber into the initial bundle of every page that shows an orb.
 *
 * `quality="lite"` (ARENA-PERFORMANCE.md Step 2: "quality tiers, not on/off") renders the exact
 * same scene at a cheaper geometry subdivision and a tighter dpr cap on weaker devices — the 3D
 * itself is never removed, only scaled down. `frameloop` pauses the whole render loop while the
 * tab is hidden (the file's "single biggest battery/CPU win on phones"), independent of quality. */
export function OrbScene({
  state,
  cameraDistance = 3,
  quality = "full",
}: {
  state: AgentOrbState;
  cameraDistance?: number;
  quality?: "full" | "lite";
}) {
  const visible = usePageVisible();
  const lite = quality === "lite";

  return (
    <Canvas
      dpr={lite ? 1 : [1, 1.5]}
      gl={{ alpha: true, antialias: !lite, powerPreference: "low-power" }}
      camera={{ position: [0, 0, cameraDistance], fov: 40 }}
      frameloop={visible ? "always" : "never"}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[2, 2, 3]} intensity={1.5} color="#FFB98A" />
      {!lite && <pointLight position={[-2, -1.5, 2]} intensity={0.5} color="#FF6B35" />}
      <OrbMesh state={state} detail={lite ? 3 : 6} />
    </Canvas>
  );
}
