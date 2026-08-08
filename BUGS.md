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
| 1 | Every candidate-role page (26 of 41 route×viewport talent visits) | talent | Console warning on every page load: `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` | Fired once per mounted orb `<Canvas>` — 1x on most pages, 2x on `/dashboard` (PersistentOrb + CareerHealthGauge both mount a Canvas there) | **Investigated, no fix available.** Confirmed `three@0.185.1`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.7` are all already the latest published versions (`npm view ... dist-tags` / `npm ls`) — this isn't an outdated-dependency issue. No direct `THREE.Clock` reference exists anywhere in `src/`. R3F 9.7.0 (current stable) still instantiates `THREE.Clock` internally for its render loop; `three` deprecated it slightly ahead of R3F migrating internally. There is no app-side fix short of monkey-patching a warning suppression, which isn't worth the fragility for a cosmetic, zero-user-impact console line. Tracked as an upstream wait, re-check on the next `@react-three/fiber` release. | Low (cosmetic console noise, zero user-visible effect) |
| 2 | `/enterprise`, `/enterprise/dashboard` | recruiter | `net::ERR_ABORTED` on `/enterprise/postings/{id}?_rsc=...` (7-8x per visit) | Both pages render `<Link href={\`/enterprise/postings/${p.id}\`}>` for a list of recent postings (`enterprise/dashboard/page.tsx:74`) | **Not a bug.** Next.js `<Link>` auto-prefetches RSC payloads for links entering the viewport by default; the sweep's browser context closes before those background prefetches finish, aborting them. A real user leaving the prefetch running (or navigating into one of those links, which cancels-and-replaces the same way) never sees any error — there is no UI surface for this at all. Confirmed via source: this is standard Next.js behavior, not app-specific. | N/A — investigated and closed, not fixed |
| 3 | `/dashboard` (talent) | talent | 3-4x Chrome GPU driver message: `GL Driver Message ... GPU stall due to ReadPixels` | Desktop only, not mobile (mobile's "lite" WebGL quality tier likely avoids whatever triggers the readback) | Chrome/ANGLE driver-level diagnostic about a synchronous GPU readback stalling the render thread briefly. Not a JS error, not app-throwable, and could plausibly be an artifact of Playwright's own screenshot capture forcing a GPU readback mid-render rather than something a real user's browser does organically | Low — flagged for awareness, not treated as a confirmed real-user-facing defect without further evidence beyond this one measurement method |

## Interaction sweep results (click-every-button pass)

### Confirmed, fixed this pass

| # | Route | Role | Symptom | Evidence | Root cause | Severity | Status |
|---|---|---|---|---|---|---|---|
| 4 | Every candidate-role page (any page rendering `CandidateAppShell`'s desktop sidebar) | talent | **"Log out" is completely unclickable for any first-time visitor** (or anyone who hasn't dismissed the cookie-consent banner). Playwright: `element intercepts pointer events`, 3-5s wait then hard fail. | Isolated, clean repro (`debug-cookiebanner.js`): click fails with the banner visible, succeeds instantly (<300ms) once dismissed. Layout inspection: banner is `fixed inset-x-0 bottom-0`, 88-95px tall, `z-[900]`, full viewport width. Sidebar is `h-svh` with `flex-1` nav pushing the profile/Log-out block to the very bottom of the sidebar — directly under the banner's covered region. | `CandidateAppShell.tsx`'s sidebar never reserved space for the banner; nothing made the two aware of each other. This is also almost certainly what caused most of the interaction-sweep's page-level timeouts (60-90s) on other candidate routes — every fresh test session starts with the banner up, and any click attempt on a blocked element burns its full per-click timeout. | **High** — blocks a fundamental account action (sign-out) for every real first-time user, not an edge case | **Fixed** (`df32b1f`): new `useCookieConsentVisible()` hook (matches the existing `useReducedMotion`/`usePageVisible` pattern); sidebar reserves the banner's height as bottom padding while it's showing. Checked all 4 other role shells (Enterprise/CompanyAdmin/HiringManager/PlatformAdmin) — all use a top-nav layout, Log out nowhere near the viewport bottom, unaffected. Verified fixed live post-deploy (see below). |

### In progress — remaining interaction sweep

*(Continuing after the fix above, since it was very likely the cause of most of the
sweep's page-level timeouts. Findings for the remaining pages appended as they complete.)*
