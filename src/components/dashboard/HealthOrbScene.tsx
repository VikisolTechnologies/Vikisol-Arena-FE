"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

function HealthMesh({ value }: { value: number }) {
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
        <icosahedronGeometry args={[1, 5]} />
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
 * so the visual reads as a gauge on its own even before the SVG ring/number are noticed. */
export function HealthOrbScene({ value }: { value: number }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 2.8], fov: 40 }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[2, 2, 3]} intensity={1.3} color="#FFB98A" />
      <HealthMesh value={value} />
    </Canvas>
  );
}
