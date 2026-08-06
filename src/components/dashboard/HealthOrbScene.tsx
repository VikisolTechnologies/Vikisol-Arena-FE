"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";
import { usePageVisible } from "@/hooks/use-page-visible";

function HealthMesh({ value, detail = 5 }: { value: number; detail?: number }) {
  const meshRef = useRef<Mesh>(null);
  const t = value / 100;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += delta * (0.3 + t * 0.5);
    meshRef.current.rotation.x += delta * 0.08;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (1 + t)) * 0.045;
    meshRef.current.scale.setScalar(pulse);
  });

  const color = t > 0.7 ? "#FF8A5B" : t > 0.4 ? "#FF6B35" : "#c2530f";

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1, detail]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3 + t * 0.5}
          distort={0.14 + t * 0.26}
          speed={1 + t}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    </Float>
  );
}

/** Career Health's 3D body — glow/color/liveliness scale with the health percentage itself,
 * so the visual reads as a gauge on its own even before the SVG ring/number are noticed.
 *
 * `quality="lite"` (ARENA-PERFORMANCE.md Step 2) renders the same scene at a cheaper geometry
 * subdivision and tighter dpr cap on weaker devices - never removed, just scaled down. Render
 * loop pauses while the tab is hidden regardless of quality tier. */
export function HealthOrbScene({ value, quality = "full" }: { value: number; quality?: "full" | "lite" }) {
  const visible = usePageVisible();
  const lite = quality === "lite";

  return (
    <Canvas
      dpr={lite ? 1 : [1, 1.5]}
      gl={{ alpha: true, antialias: !lite, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 2.8], fov: 40 }}
      frameloop={visible ? "always" : "never"}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1.3} color="#FFB98A" />
      <HealthMesh value={value} detail={lite ? 3 : 5} />
    </Canvas>
  );
}
