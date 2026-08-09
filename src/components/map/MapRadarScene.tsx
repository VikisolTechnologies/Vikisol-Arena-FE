"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { usePageVisible } from "@/hooks/use-page-visible";
import { bearingDeg, haversineKm } from "@/lib/geo";
import type { Post } from "@/lib/types";

// ARENA-V2-PRODUCT-ARCHITECTURE.md §9's "hero 3D treatment" applied to §5's map/nearby
// discovery, per DECISIONS.md: a stylized relative-position visualization on a tilted plane
// (R3F, already a dependency) instead of real street-map tiles - no Mapbox/MapLibre key exists
// in this environment. Pins are placed from each post's bearing+distance off the viewer's own
// coarse position, styled with the same glass/glow language as the Talent Universe starfield.
// Never plots a raw device coordinate - both the viewer's center and every pin's position are
// already-jittered approximations by the time they reach this component (see PostMapper /
// CandidateProfileService on the backend, lib/geo.ts's jitterCoord for mock mode).

const INTENT_COLOR: Record<string, string> = { activity: "#FF6B35", ask: "#7DD3FC" };
const MAX_WORLD_RADIUS = 4.2;
const RING_COUNT = 3;

interface RadarPin {
  post: Post;
  x: number;
  z: number;
  color: string;
}

function useRadarPins(posts: Post[], centerLat: number, centerLng: number, radiusKm: number): RadarPin[] {
  return useMemo(() => {
    return posts
      .filter((p) => p.approxLat != null && p.approxLng != null)
      .map((p) => {
        const distanceKm = p.distanceKm ?? haversineKm(centerLat, centerLng, p.approxLat!, p.approxLng!);
        const bearing = bearingDeg(centerLat, centerLng, p.approxLat!, p.approxLng!);
        const r = Math.min(1, distanceKm / Math.max(radiusKm, 0.1)) * MAX_WORLD_RADIUS;
        const theta = (bearing * Math.PI) / 180;
        return { post: p, x: Math.sin(theta) * r, z: -Math.cos(theta) * r, color: INTENT_COLOR[p.intentType] ?? "#FF6B35" };
      });
  }, [posts, centerLat, centerLng, radiusKm]);
}

function RadarRings() {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: RING_COUNT }, (_, i) => {
        const r = (MAX_WORLD_RADIUS / RING_COUNT) * (i + 1);
        return (
          <mesh key={i}>
            <ringGeometry args={[r - 0.012, r, 64]} />
            <meshBasicMaterial color="#FF8A5B" transparent opacity={0.16} />
          </mesh>
        );
      })}
      <mesh>
        <circleGeometry args={[MAX_WORLD_RADIUS, 64]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.03} />
      </mesh>
    </group>
  );
}

function Sweep({ reduced }: { reduced: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y += delta * 0.6;
  });
  if (reduced) return null;
  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[MAX_WORLD_RADIUS / 2, 0, 0]}>
        <planeGeometry args={[MAX_WORLD_RADIUS, 0.35]} />
        <meshBasicMaterial color="#FF6B35" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function Pin({ pin, selected, onSelect }: { pin: RadarPin; selected: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const pulse = selected ? 1 + Math.sin(state.clock.elapsedTime * 4) * 0.15 : 1;
    ref.current.scale.setScalar(pulse);
  });
  return (
    <group position={[pin.x, selected ? 0.22 : 0.12, pin.z]}>
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(pin.post.id); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[selected ? 0.14 : 0.1, 16, 16]} />
        <meshStandardMaterial color={pin.color} emissive={pin.color} emissiveIntensity={selected ? 1.1 : 0.6} />
      </mesh>
      {selected && (
        <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="w-40 rounded-lg border border-white/15 bg-black/80 px-2.5 py-1.5 text-center text-[10px] text-white backdrop-blur-sm">
            <p className="truncate font-medium">{pin.post.authorName}</p>
            <p className="text-white/60">{pin.post.distanceKm != null ? `${pin.post.distanceKm.toFixed(1)} km away` : ""}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

function CenterMarker() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.12);
  });
  return (
    <mesh ref={ref} position={[0, 0.08, 0]}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshStandardMaterial color="#FFFFFF" emissive="#FF8A5B" emissiveIntensity={0.8} />
    </mesh>
  );
}

export function MapRadarScene({
  posts,
  centerLat,
  centerLng,
  radiusKm,
  selectedId,
  onSelect,
  reducedMotion = false,
}: {
  posts: Post[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion?: boolean;
}) {
  const visible = usePageVisible();
  const pins = useRadarPins(posts, centerLat, centerLng, radiusKm);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 6.5, 5.5], fov: 42 }}
      frameloop={visible ? "always" : "never"}
      onPointerMissed={() => onSelect("")}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[2, 4, 3]} intensity={1.4} color="#FFB98A" />
      <pointLight position={[-2, 2, -2]} intensity={0.4} color="#FF6B35" />
      <RadarRings />
      <Sweep reduced={reducedMotion} />
      <CenterMarker />
      {pins.map((pin) => (
        <Pin key={pin.post.id} pin={pin} selected={pin.post.id === selectedId} onSelect={onSelect} />
      ))}
    </Canvas>
  );
}
