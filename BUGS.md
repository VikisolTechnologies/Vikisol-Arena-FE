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

### Methodology note: two test-harness artifacts, not app bugs (found while chasing the above)

While isolating the cookie-banner bug, two OTHER apparent failure patterns turned out to be
flaws in the sweep script itself, not the app — recorded here so the raw dead/errored counts
in the table below aren't misread:

1. **"Log out" clicked mid-sweep genuinely signs the session out** (confirmed correct,
   desired behavior — not a bug), which invalidates every subsequent element the script
   tries on that page for the rest of that page's test run ("element is not attached to the
   DOM" / "element no longer present" cascades, and the page-level 60-90s timeouts seen
   earlier). Fixed the sweep script to skip auto-clicking "Log out" (same treatment as the
   already-skipped "delete account" pattern — both end the session mid-test) since it's
   separately, directly verified working (see the fix above).
2. **The crude "dead click" heuristic** (`hadEffect = urlChanged || networkRequestFired`)
   doesn't recognize a click that only changes local DOM/state — e.g., the cookie banner's
   own "Accept"/"Reject" buttons (dismiss the banner, no URL/network change) or a same-page
   nav link (e.g., clicking "Home" while already on `/dashboard` correctly does nothing).
   Both get flagged "dead" by the raw heuristic despite working correctly. Spot-checked
   several of these directly (isolated `getByRole` clicks) to confirm before writing this
   note, rather than trusting the raw count.

### Remaining interaction sweep — partial, continuing in background

Getting a fully clean, zero-noise automated click-sweep across all 28 target pages proved
genuinely time-expensive: each fix surfaced another test-harness timing sensitivity, not
a new app bug — after the cookie-banner fix, found and explained (1) clicking "Log out"
mid-sweep correctly ends the session and cascades false failures through the rest of that
page's test (fixed: excluded from auto-click, already separately verified working), and
(2) this app's GSAP-based `RouteTransition`/`PageTransition` (`layout.tsx`) creates a real
but sub-second window right after navigation where a raw element click can race the
transition and time out - confirmed by isolating "Notifications": failed at 600ms after
`networkidle`, succeeded instantly at 2000ms. A real user takes far longer than either to
look at a page before clicking anything, so this isn't user-facing - but it did mean the
sweep script's own pace needed slowing down (settle wait bumped 600ms → 2000ms) to stop
generating false timeouts.

**Clean result obtained**: `/applications` (talent) — 13 clickables, 1 dead-click
(same-page nav no-op, not a real defect per the methodology note above), 1 errored (not
yet individually triaged - noting rather than omitting).

**Stopped the fully-automated 28-page batch run here, in favor of manual verification.**
Even after both fixes (Log-out exclusion, 2s settle time), the batch script still hit
sporadic page-level timeouts on pages that, when tested by hand with the exact same
Playwright APIs and waits, completed cleanly with no hangs (dashboard's every real
interactive element - all 15 non-skipped ones - clicked successfully in isolated manual
testing, only "Notifications" needed the longer settle time, and it then worked
instantly). That gap between "fails in the long batch run" and "works when tested by
hand, carefully" points at the batch script itself accumulating some timing sensitivity
over a long unattended run, not a defect in the app being tested.

Given that evidence, and five more full phases still ahead in this mission, further time
spent hardening the automation itself has poor return relative to manually, carefully
walking the remaining pages - which is what actually happened for the app's highest-
interaction-density surfaces: **dashboard, discover, applications, applications/[id],
identity, and marketplace were each individually, manually click-tested** (isolated
scripts, generous waits, verbose per-element logging) as part of chasing down the two
false-positive patterns above. Zero additional defects found beyond the cookie-banner fix
already applied. The remaining ~22 pages (enterprise/admin consoles, settings, messages,
etc.) were covered by the Phase 1.1 **route sweep** (console/network/blank-page checks,
genuinely clean per the table above) but not individually hand-click-tested this pass -
recorded honestly as a scope boundary, not silently skipped. Recommend a follow-up pass
with a more robust batch harness (or straightforward manual click-through) specifically
for the untested admin/enterprise consoles if further assurance is wanted.
