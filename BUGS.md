# BUGS.md — ARENA-DEEP-AUDIT.md Phase 1 defect inventory

Methodology: real Chromium (Playwright) against the **deployed** app (`arena.vikisol.in` /
`api-arena.vikisol.in`), not localhost. Two passes:
1. **Route sweep** — every one of the app's 41 routes, visited by its relevant role(s),
   at 1440px and 390px: console errors/warnings, failed/4xx/5xx network requests, page
   errors, empty-body detection, screenshots. 82 total page visits.
2. **Interaction sweep** — every button/link/tab/toggle/submit on the highest-traffic
   pages, clicked individually (fresh page state per click), checking for a dead click
   (no URL change, no network request, no error — i.e. nothing happened at all).

Format: route | role | symptom | evidence | suspected root cause | severity.

---

## Route sweep results (console/network/blank-page pass)

Route sweep across all 82 (route × viewport) visits is genuinely clean at the level this
pass measures: **zero 4xx/5xx from the API, zero blank pages, zero uncaught page errors,
zero failed navigations**, on every route, every role, both viewports. Three findings,
all triaged below — two are real, one is confirmed not a bug.

| # | Route | Role | Symptom | Evidence | Root cause | Severity |
|---|---|---|---|---|---|---|
| 1 | Every candidate-role page (26 of 41 route×viewport talent visits) | talent | Console warning on every page load: `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` | Fired once per mounted orb `<Canvas>` — 1x on most pages, 2x on `/dashboard` (PersistentOrb + CareerHealthGauge both mount a Canvas there) | Internal to `@react-three/fiber`'s current version, not app code calling `THREE.Clock` directly (confirmed: no direct `THREE.Clock` reference anywhere in `src/`) — a dependency-version issue | Low (cosmetic console noise, zero user-visible effect, but real and fixable — violates the audit's own zero-warnings bar) |
| 2 | `/enterprise`, `/enterprise/dashboard` | recruiter | `net::ERR_ABORTED` on `/enterprise/postings/{id}?_rsc=...` (7-8x per visit) | Both pages render `<Link href={\`/enterprise/postings/${p.id}\`}>` for a list of recent postings (`enterprise/dashboard/page.tsx:74`) | **Not a bug.** Next.js `<Link>` auto-prefetches RSC payloads for links entering the viewport by default; the sweep's browser context closes before those background prefetches finish, aborting them. A real user leaving the prefetch running (or navigating into one of those links, which cancels-and-replaces the same way) never sees any error — there is no UI surface for this at all. Confirmed via source: this is standard Next.js behavior, not app-specific. | N/A — investigated and closed, not fixed |
| 3 | `/dashboard` (talent) | talent | 3-4x Chrome GPU driver message: `GL Driver Message ... GPU stall due to ReadPixels` | Desktop only, not mobile (mobile's "lite" WebGL quality tier likely avoids whatever triggers the readback) | Chrome/ANGLE driver-level diagnostic about a synchronous GPU readback stalling the render thread briefly. Not a JS error, not app-throwable, and could plausibly be an artifact of Playwright's own screenshot capture forcing a GPU readback mid-render rather than something a real user's browser does organically | Low — flagged for awareness, not treated as a confirmed real-user-facing defect without further evidence beyond this one measurement method |

## Interaction sweep results (click-every-button pass)

*(This section is being filled in as the interaction sweep completes — see below for
what's confirmed so far; final counts and full table to follow.)*
