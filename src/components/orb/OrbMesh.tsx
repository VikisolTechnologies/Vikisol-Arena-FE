"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";
import type { AgentOrbState } from "@/lib/agentState";

const STATE_CONFIG: Record<
  AgentOrbState,
  { color: string; speed: number; distort: number; pulseAmp: number; floatIntensity: number }
> = {
  idle: { color: "#FF8A5B", speed: 0.55, distort: 0.22, pulseAmp: 0.035, floatIntensity: 0.5 },
  thinking: { color: "#FF6B35", speed: 1.5, distort: 0.4, pulseAmp: 0.055, floatIntensity: 0.7 },
  acting: { color: "#FFB35B", speed: 2.4, distort: 0.5, pulseAmp: 0.08, floatIntensity: 0.9 },
  "needs-approval": { color: "#FF6B35", speed: 1.1, distort: 0.32, pulseAmp: 0.11, floatIntensity: 0.6 },
};

/** The orb's 3D body — an animated distorted icosahedron whose color, distortion, rotation
 * speed and pulse amplitude all shift with agent state. Reused at multiple sizes/contexts
 * (persistent mini-orb, full agent-chat orb) by just changing the containing Canvas. */
export function OrbMesh({ state }: { state: AgentOrbState }) {
  const meshRef = useRef<Mesh>(null);
  const cfg = STATE_CONFIG[state];

  useFrame((frameState, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * cfg.speed * 0.3;
    meshRef.current.rotation.x += delta * cfg.speed * 0.1;
    const pulse = 1 + Math.sin(frameState.clock.elapsedTime * cfg.speed * 1.6) * cfg.pulseAmp;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <Float speed={cfg.speed} rotationIntensity={0.25} floatIntensity={cfg.floatIntensity}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, 6]} />
        <MeshDistortMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={0.55}
          distort={cfg.distort}
          speed={cfg.speed}
          roughness={0.28}
          metalness={0.15}
        />
      </mesh>
    </Float>
  );
}
