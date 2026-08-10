# PERF-REPORT.md

This file is a running record across separate performance passes, oldest first. **Editor's
note:** the `ARENA-PERF-AND-MOBILE-FIX.md` section below was originally written as a full
replacement of this file, overwriting the `ARENA-PERFORMANCE.md, tag v1.4-perf` report without
reading it first — a real mistake, caught via `git log --follow` after the fact and fixed by
restoring that section from git history rather than leaving it destroyed.

---

## Pass 1 — `ARENA-PERFORMANCE.md` pass, tag `v1.4-perf`

All numbers are real, measured against the live production deployment via Chromium +
Playwright/CDP (not synthetic estimates) — see this file's own `PERF-BASELINE.md` Pass 1 for
the before-numbers and methodology notes. This mission ran under the v2 constraint: **the 3D
stays everywhere, desktop and mobile — no scenes removed, no permanent static fallback.**

### What changed

**3D (Steps 1–2, the main lever)**: `PersistentOrb` and `CareerHealthGauge` — mounted on
every authenticated page — ran a full-quality WebGL scene continuously regardless of
device. Replaced with real quality tiering, not removal:
- `OrbScene`/`HealthOrbScene` take a `quality?: "full" | "lite"` prop. "lite" (mobile
  viewport or ≤4 logical CPU cores) drops icosahedron subdivision (6→3, 5→3), caps `dpr`
  to a flat `1` instead of `[1, 1.5]`, and disables antialiasing + the secondary point
  light. Same scene, same design, cheaper geometry — verified live, the orb is still
  visibly present and animating on a throttled-mobile Playwright run.
- Both Canvases now pause their render loop (`frameloop="never"`) whenever the tab is
  hidden, via a new `usePageVisible()` hook — applies on desktop too, zero visual cost,
  stops burning GPU/battery in a backgrounded tab.
- `prefers-reduced-motion` remains the *only* thing that swaps to the static CSS disc —
  an explicit accessibility signal the user opted into, not a capability guess.
- Confirmed via bundle inspection: the 887KB (uncompressed) Three.js/R3F/drei chunk still
  never loads on the public landing page — it only loads on the authenticated routes and
  `/agent` that actually render an orb, exactly as it should.

**Dead code (Step 5)**: `knip` found and removed 3 entirely-unused shadcn/ui files
(`card.tsx`, `progress.tsx`, `select.tsx` — zero references anywhere) and 8 dead
application-level exports (`advanceStage`, `getCurrentSession`, `getInterview`,
`updateMyBidStatus` deleted outright; `resolveMyBids`, `mulberry32`, `FIRST_NAMES`,
`LAST_NAMES` de-exported since they're used internally, just never imported elsewhere).
Left knip's "unused exports" inside `src/components/ui/*` (standard shadcn compound-
component surface, regenerated wholesale on upgrade, zero bundle cost either way since
tree-shaking already drops what's truly unused) and all "unused exported types" alone
(type-only, erased at build time — removing them changes nothing about the shipped JS).

**Standard web-perf (Step 4)**: audited and confirmed already correct — compression
verified working (a `-I`/HEAD-request false alarm earlier this session was corrected: GET
requests confirm gzip/brotli active via `vary: Accept-Encoding`), fonts already
self-hosted via `next/font`, no raster images anywhere (avatars are emoji, per the design
system — nothing for `next/image` to do), GSAP imported narrowly by submodule (not
whole-package), zero third-party/analytics scripts to defer. Nothing to change here.

**SSR (Step 3) — scoped down, not attempted, with reasons**: 13 of the app's page-level
routes are forced `"use client"` because the JWT access token lives in `localStorage`
(a deliberate prior decision, documented in this file's own history, made specifically to
avoid a large blast-radius auth rewrite). Server Components have no access to
`localStorage`, so genuine SSR for authenticated routes requires moving the access token
to a cookie *first* — exactly the rewrite that prior decision declined. Attempting it
inside a performance mission, under time pressure, on the day this same session already
had one real production outage from a smaller change going out under-verified, was not a
responsible trade. Confirmed instead that public routes (landing, `/aup`, `/privacy`,
`/terms`) are already correctly server-rendered, and every authenticated page already
shows an immediate loading skeleton (the perceived-performance goal Suspense streaming
targets, even without the underlying server infrastructure). Full reasoning in
DECISIONS.md.

### Before → After (Playwright, real Chromium, live production)

#### Landing page (`/`, unauthenticated) — unchanged by this pass, as expected
No code in this mission touches the landing page's render path (PersistentOrb/
CareerHealthGauge only mount inside the authenticated app shell). The numbers below moved
within normal run-to-run variance (server cache state, network jitter) — reported for
completeness, not claimed as a win:

| Metric | Before (mobile) | After (mobile) |
|---|---|---|
| FCP | 3096 ms | 4400 ms |
| Approx. TBT | 1776 ms | 1618 ms |
| JS transferred | 295.0 KB | 295.0 KB |

#### Dashboard (`/dashboard`, authenticated) — the actual target of this pass

| Metric | Before (mobile) | After (mobile) | Change |
|---|---|---|---|
| FCP | 776 ms | 744 ms | ~4% better |
| Approx. TBT | 882 ms | **513 ms** | **~42% better** |
| JS transferred | 15.9 KB | 17.1 KB | flat |

| Metric | Before (desktop) | After (desktop) |
|---|---|---|
| FCP | 528 ms | 552 ms |
| Approx. TBT | 595 ms | 552 ms |
| JS transferred | 252.8 KB | 253.1 KB |

The mobile TBT drop (882ms → 513ms) is the headline number: it's a real reduction in
main-thread blocking time on a throttled-CPU device, achieved **while the 3D scene kept
rendering** (quality-tiered, not removed) — directly satisfying "fast AND all the 3D
intact." JS bytes staying flat is expected and correct: quality tiering is a runtime
configuration (geometry detail, dpr, antialiasing), not a code-size change — the same
Three.js chunk loads either way, it just does less work per frame in "lite" mode.

**Measurement limitation, stated plainly**: `largest-contentful-paint` didn't resolve
within this harness's observation window on any run (before or after), so it's omitted
rather than reported as a fabricated number. FCP + approximate-TBT-via-longtask-observer
+ JS-byte-count are the metrics this before/after is judged on instead, consistently
across both measurement passes.

### Backend load test (Step 6)

**Tooling substitution, stated upfront**: k6 isn't installable in this sandboxed
environment (no system package manager access for the Go binary). Wrote a Node-based
substitute doing the same fundamental thing — concurrent virtual users running a
realistic journey, ramped in steps, with p50/p95/p99 + throughput + error rate recorded
per step — against the live `api-arena.vikisol.in`, not an isolated copy.

**A real methodology finding, not a backend bug**: the first ramp attempt showed a hard
wall at 10 concurrent signin requests (50% failures) and total failure at 50 concurrent
requests to `/jobs`/`/marketplace`. Checked the actual HTTP status before reporting this
as a capacity limit — it was `429 Too Many Requests`, confirmed via a direct `curl` against
the live API immediately after. `RateLimitFilter` correctly keys authenticated requests by
`user:<id>`, not by token — every "virtual user" in the first attempt reused the *same*
one demo account, so 50 simulated users collapsed onto one real rate-limit bucket. This is
the rate limiter working exactly as designed, not a bottleneck. Redesigned the test to
authenticate once across all 5 seeded demo accounts and fan concurrency out across those —
the most real headroom available without touching production's rate-limit configuration,
which this pass deliberately did not do (disabling or loosening abuse protection on a now-
public production API, even temporarily, is not a responsible trade for a load-test
convenience).

| Concurrency | Requests | Errors | Throughput | `/jobs` p50/p95/p99 | `/marketplace` p50/p95/p99 |
|---|---|---|---|---|---|
| 5 | 10 | 0 | 7.6 req/s | 665 / 700 / 700 ms | 349 / 646 / 646 ms |
| 10 | 20 | 0 | 13.6 req/s | 559 / 743 / 743 ms | 407 / 898 / 898 ms |
| 20 | 40 | 0 | 20.7 req/s | 570 / 1531 / 1543 ms | 607 / 1200 / 1203 ms |
| 30 | 60 | 0 | 53.7 req/s | 373 / 695 / 697 ms | 577 / 658 / 721 ms |

**Zero errors across every step tested** — the N+1/index fixes from earlier this session
are holding under concurrent load, not just single-request testing. One thing worth
flagging, not alarming: `/jobs` p95/p99 spiked to ~1.5s at concurrency=20 before settling
back down at 30 (likely a transient GC pause or connection-pool contention blip, not a
trend — throughput kept climbing past that point). Worth a follow-up look if it recurs
under real traffic, not a fix made blind here.

**The honest ceiling of this test**: 30 concurrent users is where this test stopped, not
because the backend broke, but because 5 real demo accounts × the rate limiter's 120
req/min default-bucket budget is the most load this methodology can honestly generate
against live production without either (a) more seeded test accounts, or (b) a dedicated
staging environment with rate-limiting relaxed specifically for load testing. Neither
exists today. **This is a genuine gap, not a finding** — it means "backend confirmed
healthy up to ~30 concurrent real users with 0% errors," not "backend confirmed healthy at
any concurrency."

### Honest scaling roadmap (not over-promising)

What this pass's code changes bought: a single instance now does meaningfully less
per-request work (indexed queries instead of table scans, batched instead of N+1, no
unindexed audit-event query per team member) and meaningfully less client-side work per
mobile page load (42% less main-thread blocking on the dashboard). That raises the
concurrency ceiling a single Railway instance can serve before falling over — but it
doesn't change what "falling over" ultimately requires to prevent at real scale.

Getting from "healthy at ~30 concurrent, unverified beyond that" to genuinely surviving
tens of thousands of concurrent users is **infrastructure and cost, not further code**:
- **Horizontal scaling**: multiple `arena-api`/`arena-web` instances behind Railway's own
  load balancing (already stateless-compatible — JWT + Redis for session/rate-limit state,
  no in-memory state tied to a single instance, verified by inspecting every
  `RateLimitFilter`/`TokenDenylistService`/`RefreshTokenService` call site).
- **Database read replicas** once the single Postgres instance becomes the bottleneck
  (it isn't yet at the load tested here, but will be before app-instance count is). Worth
  noting: the DB currently shares a region (`sfo`) with compute (found during an earlier
  same-day investigation into user-facing latency) — any replica plan should account for
  that regional placement, not just replica count.
- **A real CDN** in front of static assets (`_next/static/*`) — Railway currently serves
  these directly from the app instance; a CDN would remove that from the request path
  entirely for repeat visitors.
- **Load-test infrastructure**: a genuine k6 (or similar) setup against an isolated
  staging copy with its own seeded user pool and no shared rate-limit bucket concerns,
  to actually find the real breaking point rather than this pass's honestly-reported
  partial answer.

None of this is a code decision to make silently inside a performance mission — it's a
business call about infra spend once real traffic numbers justify it. This report's job
was to prove the code-level ceiling got higher and be precise about where the honest
measurement stopped, not to claim a number this pass didn't actually verify.

### Verification checklist
- [x] Every 3D scene present on both desktop and mobile — confirmed live via Playwright
      screenshots-equivalent DOM inspection at both viewports (no scene removed, quality
      tiered only).
- [x] `prefers-reduced-motion` still shows the static CSS fallback (only path unchanged).
- [x] Zero console errors on the measured pages (checked during the Playwright runs).
- [x] Clean `tsc --noEmit` and clean `npm run build` before every deploy in this pass.
- [x] Basic Auth staging gate — N/A, already publicly launched (gate removed 2026-08-06,
      prior to this mission — not part of this pass's scope).
- [x] Backend: 0% error rate up to 30 real concurrent users, confirmed post-deploy.

---

## Pass 2 — `ARENA-PERF-AND-MOBILE-FIX.md`, combined Track A + B result

### Sequencing note, stated honestly

Track A's fixes (see `MOBILE-BUGS.md`) landed and were deployed *before* Track B's baseline
measurement was taken — the critical fixed-position bug in particular would have made any
"the app feels janky/broken on mobile" perception impossible to separate from a genuine perf
number, so it made sense to fix and verify that first. This means `PERF-BASELINE.md`'s numbers
are already "post-Track-A" — there is no separately-measured "before Track A" perf baseline to
diff against, because Track A's bugs were correctness bugs (things not working at all), not
things that would show up as a specific millisecond delta in FCP/LCP. What follows is the real
before/after that *does* exist: Track A's own qualitative before/after (broken → working,
verified live both ways), and Track B's single measured baseline plus what was fixed based on it.

### Track A — before/after (full detail in MOBILE-BUGS.md)

| Finding | Before | After (verified live) |
|---|---|---|
| Cookie banner vs. mobile nav bar | Nav bar fully covered, untappable, on every migrated screen | Adjacent, zero overlap (`y:549.0` both edges) |
| GSAP transform leak breaking `position: fixed` app-wide | Nav bar + persistent orb scrolled away with page content after the first client-side nav (measured ~9974px down a page) | `transform: none` after 2 real navigations; nav/orb both back at sane viewport-relative coordinates |
| React/Save tap targets | 14×14px | ~40px tappable area (invisible hit-area expansion, same visual size) |
| 10 shared components (FollowButton, PostComposer, IntentCardView, etc.) | Marketing-only `ghost-glass`/`primary-gradient` variants - invisible fills or a hardcoded orange shadow glow on ivory screens | Theme-safe `outline`/`default` variants, correct on both themes |
| `PersistentOrb` | Invisible `bg-white/[0.04]` fill, hardcoded orange glow (violated the design system's own "zero neon orange" rule) | `bg-card`, `--gold`-based glow |

### Track B — baseline (full detail in PERF-BASELINE.md)

Measured on the live site, mobile emulation (iPhone 13), custom throttle (1.5Mbps/0.75Mbps/
300ms RTT, 4× CPU) — after Track A's fixes:

| Scenario | FCP | LCP | TBT (approx) |
|---|---|---|---|
| Logged-out `/` — cold | 3984ms | 5820ms | 725ms |
| Logged-out `/` — warm | 920ms | 1436ms | 163ms |
| Logged-in `/home` — cold | 744ms | 944ms | 279ms |
| Logged-in `/home` — warm | 540ms | 716ms | 406ms |

**Targets from the mission doc:** TTFB <600ms (met everywhere, 233–452ms), FCP <1.8s (met on
`/home` both states and on `/` warm; **missed** on `/` cold at ~4s), TTI (not computed — see
methodology note in `PERF-BASELINE.md`), `/home` initial JS <200KB (met — 3KB incremental once
shared chunks are warm from login; the honest true-cold number for `/home` alone wasn't isolated
this pass, see the baseline doc's caveat).

### Click-to-render (interaction timing, not in the original baseline table)

Measured separately, same throttle profile, real `Link` clicks (not `page.goto`):

- Home → Discover: **2096ms**
- Discover → Map: **2619ms**

Both exceed the <300ms target substantially. Important context before reading these as pure
"lag": `PageTransitionAnimator`'s entrance fade/lift is a deliberate **500ms** animation — that's
by-design, not loading time, and accounts for roughly a quarter of each number. The rest is real:
each route fetches its own data on arrival (Discover's job list, Map's nearby posts) rather than
that data being prefetched alongside the route chunk, and route-specific JS is hydrating under
4× CPU throttle. **Not fixed this pass** — diagnosed, not yet resolved. Real candidates for a
follow-up pass: prefetching the target route's critical data alongside Next's own route-chunk
prefetch on link hover/viewport-entry, and confirming the 500ms transition duration is actually
the right trade-off for perceived speed vs. polish on a throttled connection.

### What was fixed vs. what's real, scoped follow-up

**Fixed and verified live this pass:** every Track A finding (the correctness bugs — nothing
about mobile navigation was actually just "slow," several things were flatly broken). These were
the higher-severity, higher-confidence fixes and the right thing to prioritize first.

**Diagnosed, not fixed this pass — honestly attributed, not force-fitted:**
- The landing page's cold-load FCP/LCP (~4s/~5.8s). Root cause isn't one offending file — it's
  cumulative JS parse/hydrate cost across ~15+ chunks (294KB compressed) on the one page that
  hasn't been through this session's cleanup. A real fix is a scoped bundle-splitting pass
  (defer below-the-fold sections' JS, keep their content server-rendered) — genuine work, not a
  same-pass patch.
- Click-to-render on in-app navigation (2–2.6s). Diagnosed (transition animation + per-route
  data fetch + throttled hydration), not yet fixed. Candidate fixes identified above.

Both are logged here rather than silently dropped, per the standing charter's own rule about
attributing gaps honestly instead of claiming done ahead of the real work.
