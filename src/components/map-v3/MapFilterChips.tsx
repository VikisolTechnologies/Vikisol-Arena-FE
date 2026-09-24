import type { CSSProperties } from "react";
import { ARENA_V3 } from "@/components/home-v3/tokens";

// Nearby shows activities only (Arena restructure: needs/questions live in Discuss), so the
// map's only filter is distance. The old All/Activities/Needs type chips went with that.
export function MapFilterChips({
  radiusKm,
  onRadiusChange,
}: {
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}) {
  const chipStyle = (active: boolean): CSSProperties => ({
    fontSize: 11,
    padding: "7px 14px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    background: active ? ARENA_V3.ink : "rgba(20,20,23,0.85)",
    color: active ? ARENA_V3.ivory : "#a1a1aa",
  });
  return (
    <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", flexWrap: "wrap", gap: 6, zIndex: 5 }}>
      {[2, 5, 10, 25].map((km) => (
        <button key={km} type="button" onClick={() => onRadiusChange(km)} aria-pressed={radiusKm === km} style={chipStyle(radiusKm === km)}>
          {km}km
        </button>
      ))}
    </div>
  );
}
