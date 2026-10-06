# Arena B+ design tokens

Source: founder's `ARENA-FE-BPLUS-BUILD.md` mission §3, sampled against the attached board PNGs
(Concept A/B/B+, Onboarding B+, Discover & Join B+, Need→Outcome B+, Career B+, Recruiter B+,
Messages & Trust B+, VNext Jenny ×2). Values below are the mission's own pinned hexes — this file
exists so a later session has them without the images in context, plus the font decision the
mission asked for.

## Colour

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#16110F` | App background (warm graphite, not pure black) |
| `--surface-raised` | `#211A17` | Cards/sheets on dark surfaces, header bar |
| `--line` | `#3A2F2A` | Hairline borders on dark |
| `--paper` | `#F7F0E6` | Cream card/sheet/form background |
| `--paper-muted` | `#EFE6DA` | Secondary cream surface (nested cards, input fill) |
| `--ink` | `#1E1714` | Text on paper |
| `--ink-muted` | `#6E625A` | Secondary text on paper |
| `--text-on-dark` | `#F5EEE6` | Primary text on dark |
| `--text-on-dark-muted` | `#A89C92` | Secondary text on dark |
| `--primary` | `#FF5A1F` | Orange primary action |
| `--primary-pressed` | `#E24A12` | Orange pressed/active state |
| `--success` | `#2F9E5B` | Confirmations, Offer category, completed states |
| `--info` | `#3B82F6` | Activity category, informational chips |
| `--warning` | `#F2A93B` | Pending/attention states |
| `--danger` | `#E5484D` | Destructive actions, errors |

**Category colours** (Create sheet, kind chips): Need = orange-red (`--primary`), Offer = green
(`--success`), Activity = blue (`--info`), Project = green (`--success`), Job = orange
(`--primary`), Jenny = pink-orange gradient (`linear-gradient(135deg, #FF5A1F, #FF8A6B)` as the
working value — refine against the literal Jenny-orb art when built).

No component may hold a literal hex — everything above becomes a Tailwind theme colour + CSS
custom property; components reference the token name only.

## Type

- **Display/headings**: a warm, high-contrast serif with humanist curves and ball terminals — the
  boards' "Arena VNext" wordmark and screen headlines ("Local people. Real outcomes.", "Create
  your account", "Why are you here?") read as this family of serif, not a neutral/geometric one.
  **Pick: Fraunces** (via `next/font/google`, variable, optical sizing on). It's the closest
  visual match among the four candidates the mission named — warmer and more editorial than
  Playfair Display (too classical/thin), less novelty than Instrument Serif (single-weight,
  wouldn't cover the 32–24px range needed), and has more personality than DM Serif Display (too
  plain for the "premium editorial network" framing in Concept A's own subtitle). Load weights
  400/500/600. Revisit once real screens are built and can be A/B'd against the board crops
  directly — this is a judgment call from static images, not a pixel-measured match.
- **Body**: Inter (`next/font/google`), weights 400/500/600.
- **Scale**: display 32/36, title 24, card title 17, body 15, meta 13, caption 12 (all `px`,
  convert to `rem` in the Tailwind theme at a 16px root).

## Shape & spacing

- Radius: cards `20px`, tiles `16px`, buttons `14px`, chips `9999px` (full).
- Spacing: 4pt grid throughout. Screen gutter `20px`.
- Icons: `lucide-react`, `stroke-width: 1.75`.

## Logo

SVG component: the orange "A" chevron mark (two angled strokes forming an arrow/roof shape, as
seen top-left of every B+ board) + lowercase "arena" wordmark in the display serif, weight 600.
Build as `src/components/brand/ArenaLogo.tsx`, size via a single `size` prop (mark-only vs
mark+wordmark variants for header vs splash use).

## Photography

- Warm, golden-hour Hyderabad feel (see the onboarding Welcome hero, Feed hero cards).
- Preview-data mode: free-licence photos only (Unsplash/Pexels), saved under
  `public/fixtures/`, credited in `public/fixtures/CREDITS.md`. Never hotlink external URLs.
- Real mode: user-uploaded photos with an initials-avatar fallback (no photo = coloured circle +
  initials, not a placeholder image).

## Enforcement

- All of the above live in `tailwind.config` theme extension + `:root` CSS custom properties.
- A lint rule / code-review check (not built yet — flag in P0) should catch a raw hex literal
  landing in a component file outside `globals.css`/the theme config.
