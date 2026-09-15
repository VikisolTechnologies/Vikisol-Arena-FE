import type { CSSProperties } from "react";
import { ARENA_V3 } from "@/components/home-v3/tokens";

// ARENA-PHASE-1-BUILD.md §3.2 "Filter chips overlaid top: Activities / Needs / People. Active
// chip is ivory on dark; inactive is dark surface with muted text." "People" isn't included here
// - Map only ever queries Post data (GET /posts/nearby); there is no candidate-location-search
// endpoint to back a people layer, and inventing one is real, separate Stage C work, not a
// styling pass. Named explicitly rather than silently dropped.
export type MapTypeFilter = "all" | "activity" | "ask";
const TYPE_CHIPS: { key: MapTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "activity", label: "Activities" },
  { key: "ask", label: "Needs" },
];

export function MapFilterChips({
  typeKey,
  onTypeChange,
  radiusKm,
  onRadiusChange,
}: {
  typeKey: MapTypeFilter;
  onTypeChange: (key: MapTypeFilter) => void;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
}) {
  const chipStyle = (active: boolean): CSSProperties => ({
    fontSize: 11,
    padding: "7px 14px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    background: active ? ARENA_V3.ivory : "#2B241C",
    color: active ? ARENA_V3.ink : "#C9BFB1",
  });
  return (
    <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", flexWrap: "wrap", gap: 6, zIndex: 5 }}>
      {TYPE_CHIPS.map((c) => (
        <button key={c.key} type="button" onClick={() => onTypeChange(c.key)} style={chipStyle(typeKey === c.key)}>
          {c.label}
        </button>
      ))}
      <span style={{ flexBasis: "100%", height: 0 }} />
      {[2, 5, 10, 25].map((km) => (
        <button key={km} type="button" onClick={() => onRadiusChange(km)} style={chipStyle(radiusKm === km)}>
          {km}km
        </button>
      ))}
    </div>
  );
}
