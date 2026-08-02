"use client";

import { Canvas } from "@react-three/fiber";
import { OrbMesh } from "./OrbMesh";
import type { AgentOrbState } from "@/lib/agentState";

/** Lightweight Canvas wrapper around OrbMesh — kept as its own module so it can be
 * next/dynamic-imported with ssr:false (WebGL has no server-side equivalent) without
 * pulling React Three Fiber into the initial bundle of every page that shows an orb. */
export function OrbScene({ state, cameraDistance = 3 }: { state: AgentOrbState; cameraDistance?: number }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, cameraDistance], fov: 40 }}
    >
      <ambientLight intensity={0.65} />
      <pointLight position={[2, 2, 3]} intensity={1.5} color="#FFB98A" />
      <pointLight position={[-2, -1.5, 2]} intensity={0.5} color="#FF6B35" />
      <OrbMesh state={state} />
    </Canvas>
  );
}
