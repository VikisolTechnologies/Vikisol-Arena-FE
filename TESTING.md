# TESTING.md — Arena's automated QA suite

Playwright + TypeScript. Built 2026-08-14, against currently-live `arena.vikisol.in` — there is
one real deployment today (verified: the custom domain and `arena-web-production-f1f4.up.railway.app`
serve the identical build, matching `/version` commit hash on both). No CI wiring yet — see
"What's not covered yet" below.

This suite doesn't replace the manual audit trail already in this repo (`BUGS.md`,
`PAGE-INVENTORY.md`, `PERF-REPORT.md`, `SAFETY-STATUS.md`, `E2E-STATUS.md`, `SECURITY-AUDIT.md`
etc.) — those were real, live-verified passes and their findings are cited throughout this suite
rather than re-derived. What didn't exist before this suite: anything **re-runnable**. Every prior
pass was a one-off script, run once in a session and discarded. This is the first version of this
suite that persists.

## Data safety — read this before running anything that mutates data

- All tests run against the app's one existing deployment, using the five seeded demo accounts
  documented in `TEST-LOGINS.md` (`demo.talent@…`, `demo.enterprise@…`, `demo.recruiter@…`,
  `demo.hiringmanager@…`, `admin@vikisol.dev`) — accounts that exist specifically for this
  purpose, not real users.
- `PRODUCTION-CHECKLIST.md`'s own TL;DR confirms marketplace money and AI auto-apply are not live
  — nothing in this suite can touch real payments because nothing real exists to touch yet.
- Every test that mutates state (the Settings persistence check, the sign-in-failure attempts)
  either targets a value already meant to be toggled back and forth, or restores what it changed
  before finishing — see the `candidate-golden-path.spec.ts` cleanup step for the pattern to
  follow when adding more.
- **No signup/registration test exists yet.** A real signup creates a real account, and there's no
  verified-safe delete-my-account API path to clean it up afterward — deliberately left out rather
  than shipping a test that quietly accumulates throwaway accounts. See the backlog below.
- Credentials live in `.env.test` (gitignored) only. `.env.test.example` documents every variable
  name; get the real values from `TEST-LOGINS.md`.

## Running it

```bash
cp .env.test.example .env.test   # then fill in real values from TEST-LOGINS.md
npx playwright install chromium webkit   # one-time browser download

npm run test:e2e            # everything
npm run test:e2e:smoke      # route sweep + basic sign-in checks only (fast)
npm run test:e2e:auth       # sign-in validation + protected-route/wrong-role access control
npm run test:e2e:perf       # Core Web Vitals cold-load measurement (see note below)
npm run test:e2e:a11y       # axe-core scan on the highest-traffic pages
npm run test:e2e:journeys   # the one deep, fully-real candidate journey
npm run test:e2e:mobile     # everything, mobile projects only (Pixel 7/Chromium + iPhone 13/WebKit)
npm run test:e2e:report     # open the last HTML report
```

Projects (`playwright.config.ts`): `desktop-chromium` (1440×900), `mobile-chromium` (Pixel 7,
412×915), `mobile-webkit` (iPhone 13, 390×844). Most specs run on all three automatically. Adding
another breakpoint from the QA spec's full list (1920×1080, 1024×1366, 393×852, …) is a one-line
addition to the `projects` array, not a redesign — three were chosen to start because every spec
in this suite triples in run time per project added, and 390×844/iPhone-13 is the one breakpoint
this project's own prior perf work already standardized on.

## What's actually covered right now

- **Route sweep** (`tests/e2e/smoke/route-sweep.spec.ts`): all ~45 static routes this app has
  today, visited by the correct role (or logged-out for public ones), checking HTTP status,
  console/page/network errors against a documented allowlist, non-blank render, and horizontal
  overflow. Sourced from this repo's own `ROUTES.md`/`PAGE-INVENTORY.md`, not re-derived blind.
- **Auth**: sign-in validation (empty fields, malformed email, wrong password, loading state),
  session-survives-reload, protected-route redirects, wrong-role access denial (regression guard
  for a bug class this app has hit for real before — see `PAGE-INVENTORY.md` findings #1/#2 and
  `DECISIONS.md`'s PA7 writeup), and the actual (no-deep-link-return) post-login redirect behavior.
- **Performance**: Core Web Vitals on the landing page's cold mobile load, methodology matching
  `MOBILE-ROOT-CAUSE.md` exactly (iPhone 13, "Slow 4G" throttle, 4× CPU) so results are
  comparable to that prior baseline. **This test is expected to fail today** — see below.
- **Accessibility**: axe-core on 8 key pages (public + talent + one enterprise page), critical/
  serious violations fail the run, moderate/minor are reported but don't.
- **One deep journey**: sign-in session → Home renders real seeded data → Applications → a real
  (live-discovered, not hardcoded) application detail → back → Identity → a real Settings
  persistence check (toggle → reload → still-persisted, the exact "says saved but isn't" bug class
  the QA spec calls out as critical).

## The performance test is a known red test, on purpose

`tests/e2e/performance/landing-load.spec.ts` asserts the landing page's cold mobile load meets
Google's Core Web Vitals "good" thresholds (FCP < 1.8s, LCP < 2.5s). As of the last measurement
(`MOBILE-ROOT-CAUSE.md`, 2026-08-12) it does not — FCP ~5.4-5.9s, LCP ~6.7-7.1s. That gap is real,
already root-caused, and not something this test run fixes:

1. **Dominant cause**: a shared ~300KB-compressed JS floor that loads on every route app-wide,
   including the landing page — GSAP alone is ~155-192KB of it, loaded even on routes that never
   use ScrollTrigger/Draggable. Two genuine attempts to defer/lazy-load it were tried and verified
   (via real re-measurement, not assumption) **not to reduce it** — see `MOBILE-PERF-BASELINE.md`'s
   "Best-evidence root cause" section for why (Turbopack's automatic commons-chunking appears to
   classify `gsap` as eager-preload-worthy app-wide as long as *any* route uses it synchronously,
   and 11 other components still do). The one concretely-scoped, not-yet-attempted next step from
   that investigation: convert those remaining 11 static `gsap` imports to the same lazy pattern
   already used successfully elsewhere, then re-measure. Genuinely uncertain to work (stated
   honestly in that doc), and touches `Hero.tsx` — the landing page's own above-the-fold entrance
   animation — closely enough that it needs real visual regression verification before shipping,
   not a blind attempt in the same pass as building this test suite. Recommended as the next
   dedicated perf sprint, now with this suite available to verify it safely.
2. **Second contributor**: ~2.8s of cold TTFB under simulated Slow 4G is connection-establishment
   latency (DNS+TCP+TLS under high round-trip time), confirmed via direct `curl` to be unrelated
   to backend response time. Not code-fixable — would need a CDN edge or similar infra change, a
   cost/infra decision, not an engineering task this suite can resolve.
3. `/home` (the actual post-login route most returning users hit) is **not** part of this gap —
   it already meets the "good" thresholds under the identical throttle profile, and this suite
   asserts that as a hard (not soft) regression guard, precisely so it stays true.

Per this project's own testing rule (`CLAUDE.md`, spec §31): the assertion stays at the real
target, not loosened to "pass by default." A regression ceiling (hard fail well above the known
baseline) still catches anything that makes this measurably *worse*. When the bundle-splitting or
infra work above ships, this test turning green is the actual proof it worked.

## What's NOT covered yet — honest backlog, ranked

1. **CI wiring.** No GitHub Actions workflow yet. Needs `ARENA_*_EMAIL`/`ARENA_*_PASSWORD` as
   repo secrets before it can run unattended — a credentials decision, not just YAML.
2. **Visual regression baselines** (`toHaveScreenshot()`). The route sweep captures screenshots
   today but doesn't diff them against a baseline yet — spec §16/§35's own instruction is to
   audit the current UI for real defects *before* freezing it as the "correct" baseline, which
   hasn't happened. Recommend a dedicated visual-audit pass first, then baseline.
3. **CRUD/mutation coverage for Feed, Map filters, Rooms/messaging send, Marketplace bid/award,
   Interview scheduling, full Settings (autonomy dial, consent toggles, location tiers, account
   deletion).** This pass built the infrastructure and one deep proof-of-pattern journey; extending
   it to the other 9 journeys named in the QA spec's §34 is real, mechanical work on top of what's
   here now, not a redesign.
4. **Signup/registration flow.** Deliberately not built this pass — see "Data safety" above.
5. **Dynamic-route coverage in the plain route sweep** (job detail, candidate detail, company
   detail by ID) — partially covered via the one journey test's live-discovered application
   detail; not swept systematically across every dynamic route yet.
6. **Full accessibility sweep** across all ~45 routes (today: 8 representative pages) and a
   keyboard-only navigation pass specifically for the non-semantic `div onClick` list cards
   (`PAGE-INVENTORY.md` finding #5 — a real, already-documented, unfixed gap).
7. **Load/stress testing.** `PERF-REPORT.md` already has a real (if self-acknowledged partial)
   load-test methodology and result against this same backend; not re-implemented in Playwright,
   which isn't the right tool for concurrent-user load generation anyway.
8. **BrowserStack / mabl.** Named in the original ask as complementary tools — both are paid
   third-party SaaS requiring an account/billing decision this session can't make unilaterally.
   The Playwright suite here is free, fully self-hosted, and was the option explicitly called
   "permanent" — that's why it's what got built. If cross-device cloud coverage (BrowserStack) or
   codeless AI exploration (mabl) is still wanted, that's a provisioning decision, not engineering.

## Known-harmless console/network noise (the allowlist in `tests/utils/monitor.ts`)

Three patterns are filtered, each individually investigated and confirmed non-bugs in a prior
session (not a blanket suppression — anything else fails the test it happens in):

1. `THREE.Clock … deprecated` — upstream `@react-three/fiber` 9.7.0 (latest) still uses it
   internally; no app-side fix exists (`BUGS.md` #1).
2. `net::ERR_ABORTED` on URLs containing `_rsc=` — standard Next.js `<Link>` prefetch-cancellation
   when a browser context navigates away mid-prefetch (`BUGS.md` #2).
3. Chrome/ANGLE `GPU stall due to ReadPixels` driver messages — not a JS error, possibly a
   Playwright screenshot-capture artifact rather than something a real user's browser emits
   (`BUGS.md` #3).
