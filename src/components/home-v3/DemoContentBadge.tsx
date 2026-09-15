import { ARENA_V3 } from "./tokens";

// ARENA-WEB-AND-SEED.md Part 4.2 - "every seeded item carries a visible 'Demo content' marker
// in the UI... it must be impossible to screenshot it and believe the network is alive." Small,
// legible, unmissable - not a subtle dot. Renders nothing when the item isn't seeded, so it's a
// true no-op on every real post.
export function DemoContentBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: ARENA_V3.champagneText,
        background: ARENA_V3.champagne,
        borderRadius: 4,
        padding: "2px 6px",
        flexShrink: 0,
      }}
    >
      Demo content
    </span>
  );
}
