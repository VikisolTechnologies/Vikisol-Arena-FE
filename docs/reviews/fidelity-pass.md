# Fidelity pass — 29 Sep 2026

Architect review of localhost:3001 ("many Done screens don't match the boards"). Every screen was
re-captured at **390 × 844** next to its board crop, signed in with preview data.
Side-by-side images: `docs/reviews/fidelity/<screen-id>.webp` (board left, live right).

Live pairs: `localhost:3001/dev/compare/all` (every built screen, board vs live).

## How the comparison was made

- **`/dev/person?to=<path>`** (new) — mock mode only. It signs in Priya Sharma, a preview neighbour
  in Gachibowli, and resets the preview world to a fresh week. The world includes:
  - 13 neighbours with photos;
  - activities, needs and offers within 5 km, plus two out-of-radius items for honesty;
  - her hosted, joined and finished items, and room chats.

  `&stage=onboarding` gives the P1 onboarding states (signed in, not onboarded).
- **`/dev/business?to=<path>`** — the recruiter twin (from P7/P9).
- Every signed-in screen in `screens.json` now routes through one of these, so `/dev/compare` always
  shows a lived-in account. Before, it showed the logged-out or empty state.
- Screens that don't truly match their board are back to **In progress**, each with a note on
  `/dev/progress` saying exactly what differs.

**Result after the follow-up: 36 board screens Done, 13 In progress.**

## What changed in this pass

| Area | Change |
|---|---|
| **Blank feed** | Root cause: the dev server refused the founder's phone (LAN origin). The page rendered its shell but never hydrated, so the chips showed and nothing else. Fixed with `allowedDevOrigins` in `next.config.ts` (dev only). The feed now follows the board order: header and area, a hero activity with photo, time chip, distance and going faces, two cream Need cards, then an Offer card with a photo. |
| **Empty feed** | An honest empty state: "Nothing within 5 km yet", with **Create an activity** / **Widen to 15 km**. |
| **Nearby honesty** | Nearby = has a point within the person's radius. The radius is measured from their approximate point, else their chosen area centre, else the launch zone (Gachibowli, 5 km). Items that only have a place name, or sit in another city, never count as nearby. Test: `tests/local/feed-nearby.local.ts`. |
| **Preview-data label** | Every sample item now carries it: feed, Discover and activity tiles (per card), Jobs (section), and the Business app (next to every page title). In mock mode `isDemo()` is true for all content. |
| **"Jenny prepares, you approve"** | Settings no longer offers **Autopilot** or **Auto-apply**. If an older account has either on, the sheet explains and offers "Turn it off". The Settings row, Pricing ("Autopilot mode" removed; "finds + applies" → "prepares — you approve") and Privacy copy were changed to match. |
| **Photos** | 12 Indian portraits and 8 activity, need and offer photos, all free-licence (CC BY 2.0 / CC0 via Openverse). They are cropped, stored as WebP in `public/fixtures`, and credited in `public/fixtures/CREDITS.md`. They are used by the preview neighbours (Avatar, mock mode only), feed, Discover people tiles, Work rows, Inbox, Profile, candidates and specimens. |
| **Welcome** | New golden-light park photo (credited; a ©-link replaces the text credit). The logo sits at the board's size with the tagline under the wordmark. A text shadow keeps the headline legible. |
| **Logo** | The mark is redrawn as the board's bold, rounded orange "A": one thick stroke with a soft apex and an inward foot, in a warm two-stop orange. |
| **Covers** | The procedural covers are now photographic in feel: a deep sky gradient in the category colour, one soft light source, 2–3 blurred horizon layers, film grain and a vignette. A small glyph sits in the top-right corner and the lower third stays calm for the title. Each activity still gets a unique cover. A real photo always wins. |
| **Cookie banner** | Now a compact one-row bar ("Only essential cookies… Reject / OK") that never covers Welcome's buttons or footer tagline. |
| **Business** | Jobs cards, pipeline cards, the candidate list and talent cards are now cream paper with photo avatars on the dark background. Status pills and buttons have paper variants. |

## Screen by screen (board vs live at 390 px)

**✅ = matches the board (differences are only the documented API gaps). 🟡 = In progress (what still differs).**

### P1 Entry
- 🟡 **Welcome** — The board photo shows runners with the city skyline behind. No free-licence photo like that was found, so live uses a golden-light park. Layout, logo, buttons and tagline match.
- ✅ **Sign up / Sign in** — The Google button is hidden until the preview has a client id (gap #6).
- ✅ **Why here / Local life / Your identity / All set** — Match. Early steps start empty, as on the board.

### P2 Core
- ✅ **Feed** — Board order and cards, with photos and going faces. Needs show "replies" where the board says "offers": needs don't expose an offer count to viewers.
- ✅ **Discover** — Photo people tiles, the popular grid with photos, and skills.
- 🟡 **Map / Map results** — No map tiles (no tile provider). The board's bottom preview card only appears after a pin is tapped.
- ✅ **Work** — Active / Upcoming / Completed with photos or faces, role lines and reply counts.
- ✅ **Create**
- ✅ **Profile** — The board's "Online" pill isn't shown (no presence data). Stats and outcomes are real counts.
- 🟡 **Jenny** — The orb is muted rather than the board's glowing sun. Rebuilt in P8.

### P3 Discover & join
- ✅ **Personal feed**, **Activity details**, **Join sent**
- ✅ **Approved & ready** — No meeting-point photo or "Set reminder" (gap #7).
- 🟡 **Discover filter** — The chip set differs from the board (Today / Weekend / Free + category filters).
- 🟡 **Activity room** — The board uses the activity photo as the header and has a tools bar.

### P4 Need → outcome
- ✅ **Need create**
- ✅ **Post a need** — Live is category → intake (flow §4 is the authority over the single-form board).
- ✅ **Need page**
- ✅ **Coordination room**
- ✅ **Mark completed**
- 🟡 **Offer details** — Live is a sheet; the board is a full page with interests, outcomes and the offer message (gaps #12–13).
- 🟡 **See the outcome** — Should open Work on Completed, with the profile summary.

### P5 Messages & trust
- ✅ **Inbox** — Room photos and company monograms.
- ✅ **Conversation** — The board's audio session isn't built (no API).
- ✅ **Notifications**
- ✅ **Settings & privacy**
- ✅ **Report / block** — Evidence upload waits for gap #15.
- ✅ **Resilient states**
- 🟡 **Search** — Suggestions show until a query is typed. The board shows photo results and radius filters (gap #17).

### P6 Career
- ✅ **Career intent**
- ✅ **Career setup** — Stepped intake (flow §2).
- ✅ **Privacy preview**
- ✅ **Apply & track**
- 🟡 **Career profile** — The board is a tabbed career page.
- 🟡 **Work → Jobs** — The board puts jobs inside Work with type chips.
- 🟡 **Job details** — Tabs, lists and the hiring team differ from the board (gaps #22, #29).

### P7 Recruiter
- ✅ **Choose role**
- ✅ **Company workspace** — Verification waits for gap #29.
- ✅ **Post a job**
- ✅ **Manage job / Candidate profile / Interview & hire** — Follow-up commit: every panel is now a cream paper card (a `data-surface="paper"` token scope remaps faint text, lines and status colours for cream), on the dark background as the review asked. The phone layout keeps the business top bar.
- 🟡 **Candidates** — The list matches (cream, photo avatars), but it sits under the job's Candidates tab rather than being a standalone screen.

## Next

1. Close the 🟡 items above, starting with Map tiles and the Discover filter.
2. Then continue P8 → P10 → P11 as planned.
