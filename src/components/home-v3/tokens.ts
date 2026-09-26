// Inline-style palette for the v3 screens (Map, Inbox, Rooms, Work, Profile, Post detail,
// CreateComposer). Founder decision (2026-09-25): these run on Arena's real dark/orange brand
// like everything else, not the ivory/gold palette this file originally held.
//
// Token NAMES keep their original ROLES so every call site reskins without edits:
//   ivory  - page ground            -> near-black
//   white  - card surface           -> raised dark surface
//   ink    - primary text, and the fill of inverted pill buttons (ink bg + ivory text)
//            -> light text; those pills become light-with-dark-text, still high contrast
//   gold / goldText - the one accent -> Arena orange
// Muted/body text values keep >= 4.5:1 on both ground and card (WCAG AA for the small text they
// carry - eyebrows, timestamps, captions).
export const ARENA_V3 = {
  ivory: "#09090b",
  white: "#141417",
  ink: "#f5f5f6",
  espresso: "#0d0d10",
  espressoLight: "#1b1b1f",
  mapDark: "#0d0d10",
  body: "#a1a1aa",
  muted: "#a1a1aa",
  hairline: "rgba(255,255,255,0.12)",
  hairlineCard: "rgba(255,255,255,0.08)",
  gold: "#ff6b35",
  goldText: "#ff8a5b",
  champagne: "#ff8a5b",
  champagneText: "#160a05",
  inactiveTab: "#a1a1aa",
} as const;
