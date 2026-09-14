import { ARENA_V3 } from "./tokens";

// ARENA-PHASE-1-BUILD.md §2 "Imagery" - "Where no photo exists, use the champagne initials
// circle — never a generic grey silhouette." Deliberately a new, small component rather than
// reusing the existing PersonAvatar (which defaults to a pravatar.cc random-face placeholder,
// documented there as a stand-in for a photo-upload pipeline that doesn't exist yet) - this
// screen's spec explicitly wants the honest initials treatment as the default, not a fake photo.
export function ChampagneAvatar({ name, sizePx }: { name: string; sizePx: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{
        width: sizePx,
        height: sizePx,
        borderRadius: "50%",
        background: ARENA_V3.champagne,
        color: ARENA_V3.champagneText,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: sizePx * 0.4,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}
