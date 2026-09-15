// ARENA-PHASE-1-BUILD.md §2 "Colour" table, verbatim. Deliberately NOT added to globals.css's
// shared [data-theme="product"] block: that block is already live under AppShell across ~50
// unmigrated routes (Discover, Work, Map, etc.) - changing its values would shift how every one
// of those currently-shipped screens looks today, which is exactly the "touch only Home, stop
// before the other seven" scope this checkpoint exists to respect. These are scoped to the new
// Home screen's own component tree only, via plain inline style / Tailwind arbitrary values -
// same approach the reference mockups themselves use. Once all eight screens are built and this
// becomes the app's one real theme, promoting these into globals.css is the mechanical last step
// (see globals.css's own [data-theme="product"] comment for the identical precedent).
export const ARENA_V3 = {
  ivory: "#F7F1EA",
  white: "#FFFFFF",
  ink: "#111111",
  espresso: "#221C17",
  espressoLight: "#2B231C",
  mapDark: "#1B1713",
  body: "#6B655C",
  // ARENA-FINISH-IT.md §5 "axe-core accessibility clean, no AA contrast failures" - the
  // mockups' own #8A7F6E only reaches ~3.5:1 on white/ivory (WCAG AA needs 4.5:1 for the small
  // text this token is used for everywhere - eyebrows, timestamps, captions). Darkened to the
  // nearest value that clears 4.5:1 on both surfaces with margin (~5:1), same warm grey-brown
  // hue, not a different color.
  muted: "#6E655A",
  hairline: "#DDD3C4",
  hairlineCard: "#F0EAE1",
  gold: "#D6A84F",
  champagne: "#F3D79B",
  champagneText: "#412402",
  inactiveTab: "#B0A696",
} as const;
