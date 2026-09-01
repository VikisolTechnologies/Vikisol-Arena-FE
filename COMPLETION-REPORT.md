# COMPLETION-REPORT.md — ARENA-COMPLETION-BACKLOG.md execution log

Living document, updated as each item completes. Working P0 → P6 in order per the backlog's own
instruction, but **not claiming completion of items not actually attempted** — an honest partial
pass beats a fabricated full sweep. This session's actual scope and why is stated plainly at each
checkpoint rather than silently assumed.

**Where this session actually got to**: P0 (all four items) and P1's five originally-catalogued
violations (1.1/1.2/1.4) plus half of P6 (6.1, CI wiring — needs secrets set to actually run) are
done and live-verified. P1.3 (contrast token) and P1.5 (full a11y sweep) are real, scoped,
explicitly not attempted. **P2 through P5 were not started this pass** — see the honest reason
for each below, not silence.

**2026-08-15 continuation**: CI secrets set by Syam; arena-web's Vercel migration executed through
step 3 (new project, config, env vars, CORS, 56/56 smoke tests green on the live Vercel deployment)
with the exact DNS record handed off for step 4 — see 0.1's update. `arena-api`'s Railway region
investigated and NOT executed, with a specific reason — see 0.1b. P0.4's flagged 5-10-run follow-up
done — see 0.4's update. CI investigated end-to-end: found and fixed a real deploy-race and a real
sign-in-blocking bug, one repo-config item still needed from Syam — see 6.1's update. P2's nav-shell
consolidation done; its theme-migration half scoped in full but deliberately not executed pending
one open decision — see 2.1/2.2.

---

## P0 — Speed

### 0.1 — Serving region / TTFB — ✅ investigated, recommendation below (not executed)

**Region, confirmed authoritatively** — `railway status` (this session, 2026-08-14): `arena-web`
region = **`sfo`** (Railway's US-West/San Francisco Bay Area region). This matches an older
finding in this repo (`DECISIONS.md`'s "DB currently shares a region (sfo) with compute") — that
note is correct and current, not stale.

One thing worth clearing up, since it looked contradictory at first: response headers from both
`arena.vikisol.in` and `api-arena.vikisol.in` show `x-railway-edge: sin1` (Singapore). This is
**not** a second, different compute region — Railway operates a separate global edge/proxy layer
(`Server: railway-hikari`) that terminates TLS near the requester and then proxies the request
back to wherever the actual app container runs. `sin1` is just the edge node that happened to
route my own request; the compute — where the Next.js server actually executes and generates the
response — is `sfo`, full stop. This matters because an edge-proxy layer like this does **not**
solve the latency problem the way a real CDN/edge-compute model (Vercel) does: every request still
pays the full edge↔`sfo` round trip for the actual response, on top of whatever the edge↔user leg
costs. A user's TLS handshake might terminate quickly nearby, but the page itself still has to
wait for `sfo` to generate it.

**Fresh unthrottled measurement, this session** (from this environment, not from Hyderabad — see
caveat below): TCP connect 109ms, TLS complete 180ms, TTFB 456ms, total 549ms. Consistent with
this repo's own prior measurement (`MOBILE-PERF-BASELINE.md`: 370–520ms total) — the server itself
is not slow; this is network/distance cost.

**What I can't do**: literally run a client from Hyderabad. What follows is reasoned from public,
well-documented inter-region latency figures for this exact geography (labeled as such, not
presented as a live measurement):

| Path | Typical real-world RTT | Basis |
|---|---|---|
| San Francisco ↔ Hyderabad (current: Railway `sfo`) | ~230–280ms | Publicly documented cloud inter-region latency for us-west↔ap-south1-class routes (this is the same city pair AWS publishes typical figures for) |
| Singapore ↔ Hyderabad | ~50–70ms | Well-provisioned India↔SE-Asia submarine cable routes; publicly documented ap-southeast1↔ap-south1-class figures |
| Mumbai (India) ↔ Hyderabad | ~10–25ms | Same-country backbone, ~700km |

**Why this is the biggest lever in the backlog**: TLS setup alone is 2 full round trips before a
single byte of the actual page can be requested (TCP handshake + TLS 1.3 handshake), and a real
request/response is at least one more. At an SFO-class RTT (~250ms), that's **~750ms of pure
connection-establishment cost** before the server even starts working — compounding with the
already-documented client JS-parse cost (P0.2) to produce the ~5s+ cold FCP this app currently
has. Moving the network leg alone to something India-proximate could plausibly cut that
connection-establishment cost by 600–700ms — a bigger single lever than the JS-bundle fix, and
one that's infra, not code, exactly as flagged.

**Recommendation: move `arena-web` to Vercel, keep `arena-api` on Railway** (option A from the
backlog's own three). Reasoning:
- This app is already a standard Next.js App Router project — Vercel is Next.js's own platform,
  zero framework-adaptation risk.
- Vercel's Edge Network has a Mumbai (`bom1`) point of presence — real in-country delivery for the
  static shell/JS assets, not just a closer-but-still-foreign edge like Railway's `sin1`.
- Free tier covers this comfortably (a single low-traffic Next.js app, no custom domain cost).
- **Honest limit of this fix**: this only speeds up delivery of the HTML/JS *shell*. Every
  API call `arena-web` makes to `arena-api` (profile, feed, jobs — the actual data) still crosses
  to Railway's `sfo`, unchanged, because the backlog explicitly keeps `arena-api` on Railway. So
  this fixes **first paint of the shell**, which is exactly what FCP/LCP measure and exactly
  what's been the complaint — but it does **not** fix the latency of the data calls that follow
  (the profile/feed fetch on `/home`, described in `MOBILE-PERF-BASELINE.md` §6, would still pay
  the full `sfo` round trip). Stated plainly so this isn't oversold as fixing everything.

**Exact steps to do this** (not executed — this is a real infra/DNS change, your call):
1. `vercel login` (or use the dashboard), `vercel link` inside `arena-web/`, import the existing
   `VikisolTechnologies/Vikisol-Arena-FE` GitHub repo as a new Vercel project.
2. Remove `output: "standalone"` from `next.config.ts` — that setting is specifically for the
   self-hosted Docker image this project currently builds for Railway; Vercel uses its own build
   pipeline and doesn't want it. Everything else in `next.config.ts` (headers, redirects) works
   unchanged on Vercel.
3. Set the same env vars Railway currently has for `arena-web` (`NEXT_PUBLIC_API_URL` and
   whatever else `railway variables` lists) in the Vercel project settings.
4. Point `arena.vikisol.in`'s DNS at Vercel instead of Railway (Vercel gives you the exact CNAME/A
   record once the project exists) — this repo already has a documented, successful precedent for
   exactly this kind of domain cutover (`BLOCKED.md`'s 2026-08-06 DNS section), so the mechanics
   are known, just need re-doing pointed at Vercel instead of Railway.
5. Update `arena-api`'s CORS allowed-origins (`CORS_ORIGINS` env var per `DECISIONS.md`) to
   include the new Vercel-served origin if it differs from `arena.vikisol.in` during testing.
6. Decommission the Railway `arena-web` service once the Vercel deploy is confirmed live and
   correct (keep `arena-api`, Postgres, Redis on Railway, unchanged).
7. Re-run this session's Playwright suite (`npm run test:e2e:smoke`) against the new URL before
   cutting DNS over for real, and the perf spec after, to get a genuine before/after.

**Update 2026-08-15 — steps 1–3 executed, DNS record ready, step 4 is Syam's.** Explicit go-ahead
received; executed everything short of the actual DNS cutover:

- Found the linked-by-default Vercel project (`vikisol-arena-fe`) was the **old pre-pivot project**
  with `VITE_*` env vars and a documented history of silently serving a stale build for 35 days
  (`BLOCKED.md`'s 2026-08-09 entry, `DECISIONS.md` same date) — the actual reason `arena.vikisol.in`
  was moved onto Railway in the first place was *deploy-pipeline reliability*, not a performance
  finding; nothing in that history conflicts with moving back for the (now-measured) latency reason.
  Also found that old project is **still connected via GitHub integration and has been silently
  auto-deploying every push this whole session** to its own unused `*.vercel.app` URL — never
  serving live traffic (DNS pointed at Railway throughout), but a genuine leftover from the original
  cutover's Step 5 ("retire the old Vercel project") never actually being completed. Left it alone —
  dashboard deletions are Syam-only per this repo's own standing rule (`ARENA-FINAL-CUTOVER.md`) —
  but flagging it: worth deleting once this migration is confirmed, same as originally planned.
- Created a **new**, clean Vercel project (`arena-web`) instead of reusing the stale one, connected
  it to `VikisolTechnologies/Vikisol-Arena-FE` via git integration (auto-deploys on every push now,
  same as Railway).
- `next.config.ts`: `output: "standalone"` is now conditional on `process.env.VERCEL` (present on
  Vercel's build machines, absent on Railway's) — both platforms build correctly from the exact same
  source during this dual-running window; nothing about Railway's build changed.
- `vercel.json`: added a `buildCommand` that stamps `NEXT_PUBLIC_BUILD_COMMIT`/`_BUILD_TIME` from
  `git rev-parse HEAD` before `next build`, replicating what the Dockerfile does for Railway (with a
  `local` fallback for git-less builds). Verified live: `arena-web-wheat.vercel.app/version` returns
  the exact commit it was built from.
- Copied `arena-web`'s Railway env vars (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_MODE`,
  `JWT_AUDIENCE`, `JWT_ISSUER`, `JWT_SECRET`) into Vercel (production + preview), read via Railway's
  `--kv` raw-value output and piped directly into `vercel env add` — never printed to any log.
- Temporarily widened `arena-api`'s `CORS_ORIGINS` to include the Vercel preview URL alongside the
  production domain (additive, not a replacement) so the deployment could be tested for real before
  any DNS change.
- **Full smoke + auth suite (56 tests, all 5 roles, every route) run against
  `https://arena-web-wheat.vercel.app` live — 56/56 passed.** Login, session, and every role's route
  sweep work correctly on Vercel, API calls included.
- Reassigned the `arena.vikisol.in` hostname from the old Vercel project to the new one
  (`vercel domains add … --force`, confirmed via `vercel domains verify` — `project.attached: true,
  verified: true` for `arena-web`) so Vercel is ready to serve it the moment DNS points there.

**The exact DNS change for Syam to make** (GoDaddy, per the account's current nameservers) — this is
a same-record-type update, not a record-type change, since the current record is already a CNAME:

| Field | Current | New |
|---|---|---|
| Type | CNAME | CNAME |
| Host | `arena` | `arena` |
| Value | `55amzai3.up.railway.app.` | `c90d75ae3224d553.vercel-dns-017.com.` |

Sourced directly from Vercel's own `vercel domains verify` output for this exact domain+project
pairing (not a generic guess) — its top-ranked recommendation. I have not touched DNS and won't;
Railway keeps serving `arena.vikisol.in` unchanged until Syam makes this change. Once it's live,
say so and I'll run the full suite against the real domain, then Step 5 (old-project retirement,
also Syam-only) can happen for both the stale Vercel project and the Railway `arena-web` service.

**2026-09-01 — full production outage, found and resolved same day, root cause was Railway
billing, not code.** Syam reported `arena.vikisol.in` showing Railway's "train has not arrived at
the station" page. Investigated via `railway status`/`railway logs` per service rather than
guessing: **all four services in `arena-staging`** — `arena-web`, `arena-api`, Postgres, and Redis
— were down simultaneously. Postgres's own log showed the tell: it started cleanly ("database
system is ready to accept connections"), then Railway itself sent `SIGTERM` ~5 minutes later, and
its startup message showed it had been "interrupted" and down continuously since **2026-08-19**
(13 days). `arena-api`'s log showed it couldn't even resolve `redis.railway.internal` — Redis
wasn't running. Every service getting started-then-killed by the platform itself, across app
services and both databases at once, isn't a code bug — that signature is a Railway
account/billing suspension (trial credit exhausted from 2 services + 2 databases running 24/7 for
weeks), not something fixable from the CLI or by touching code. Flagged this plainly to Syam
instead of guessing at a code fix; Syam resolved the Railway billing issue directly. Re-verified
after: all four services `● Online`, live site `200`, `/version` matches `HEAD` (`e84b4b0`), API
`/actuator/health` → `UP`, and a real DB-backed endpoint (`/public/jobs`) responds correctly
(auth-required JSON, not a 500) — confirming the whole request path through Postgres/Redis works
again, not just that the containers are up. **No data loss expected** — Postgres's own recovery
log shows a clean WAL replay from its last checkpoint, not a corrupt/reinitialized volume.

**Update 2026-09-01 — re-verified from a fresh laptop/session: DNS still NOT changed.** Authoritative
nameserver query (`ns69.domaincontrol.com`) still returns `arena.vikisol.in → 55amzai3.up.railway.app`
— Railway, not Vercel. Live site confirmed serving current code either way (`/version` returns
`fb7f022`, matching `HEAD`), so the app itself is up and correct — this is purely the pending DNS
cutover, not an outage. **The stale `vikisol-arena-fe` Vercel project was deleted this session**
(explicit go-ahead given) — `vercel project ls` confirms it's gone; `arena-web` is the only Vercel
project for this domain now, so the CNAME change above is the one remaining step.

### 0.1b — `arena-api`'s Railway region — investigated, not executed (Syam's call)

Confirmed via `railway status` (switching linked service): `arena-web`, `arena-api`, and `Postgres`
are **all** `sfo` — same project, same region, no partial multi-region setup already in place. This
matters directly for the question asked:

**Is it a setting or a migration?** A setting, for `arena-api` alone — Railway's own docs: "The
region of a service can be changed at any time, without any changes to your domain, private
networking, etc. There will be no downtime when changing the region of a service, **except if it
has a volume attached to it**." `arena-api` itself has no volume — a region change would be a
same-day dashboard/CLI setting, no rebuild-from-scratch migration. **Postgres and Redis do have
volumes** (`postgres-volume`, `redis-volume`) — moving *those* would mean real downtime while data
migrates, a materially bigger and riskier operation than moving `arena-api` alone.

**Which region?** Only **Singapore** (`asia-southeast1-eqsg3a`) is available near India — Railway's
four regions are US West, US East, EU West, and Southeast Asia. **Mumbai is not a Railway region**;
Singapore is the closest offering, real but not as close as Mumbai would be (P0.1's own table: ~50–
70ms to Hyderabad from Singapore vs. ~10–25ms from Mumbai).

**What it costs:** Railway's published pricing (`$/GB·s` memory, `$/vCPU·s` compute) shows no
regional price difference anywhere in their pricing page — same rate in every region. Moving
`arena-api` to Singapore should be cost-neutral.

**The honest catch, and why I'm not recommending doing this yet:** moving `arena-api` alone to
Singapore while `Postgres`/`Redis` stay in `sfo` **doesn't just move the latency, it relocates
which leg pays it** — every one of `arena-api`'s own database round trips (not the user's) would
newly cross the Singapore↔`sfo` distance (~150–180ms) instead of being same-region (~1–2ms). An
endpoint that makes several sequential queries could plausibly get *worse* for users, not better,
exactly the kind of N+1-shaped risk `COMPLETION-REPORT.md`'s own P3 section already flags as
unaudited in `arena-api`. Moving `arena-api` + `Postgres` + `Redis` together to Singapore would be
the version that actually helps (client↔api drops from ~250ms to ~50–70ms, api↔db stays ~1–2ms,
same-region) — but that's the operation with real downtime, on the two services with attached
volumes, and needs a maintenance window, not a same-session flip. **Recommendation: hold off until
the Vercel side is confirmed live and stable; if this is still wanted after that, it should be
scoped as its own maintenance-window task (move all three together), not a quick single-service
region flip.** Say the word when ready and I'll draft the exact migration/maintenance-window plan.

### 0.2 — The ~300KB shared JS floor (GSAP) — ✅ done, verified working

Converted all 11 files `MOBILE-PERF-BASELINE.md` identified as the remaining reason gsap loaded
on every route: `Hero`, `AgentOrb`, `Reveal`, `OpenMarket`, `CountUp`, `SkillNebula`,
`OnboardingShell`, `not-found`, `applications/page`'s interview-lock icon, and
`marketplace/[id]/page`'s bids list, **plus** `SwipeCard` — the one the prior investigation
correctly flagged as uncertain, since it drives an `useImperativeHandle` a parent calls
imperatively (a button tap can trigger a swipe before any drag happens), which a naive
`next/dynamic` conversion could break mid-interaction. Each got a matching `*Animator.tsx`
component (same `next/dynamic(() => import(...), { ssr:false })` boundary already proven for
`PersistentOrb`'s 876KB Three.js chunk and the earlier `RouteTransitionAnimator`/
`PageTransitionAnimator`/`AuraBackgroundAnimator` trio) — see each new file's own comment for the
specific reasoning. `SwipeCard.tsx` keeps its imperative-handle contract; the parent falls back to
resolving a swipe immediately (no animation, but never stuck) if triggered before its animator has
finished loading — a real but narrow, low-severity race window, not a functional break.

**Real risk this pass took seriously, not glossed over**: `Hero` and `Reveal` hide content via a
CSS class (`.reveal { opacity: 0 }`) that only gsap was reversing — unlike the other 9 files
(which use gsap's `.from()`/`.fromTo()` to set their own hidden state imperatively, so they
degrade to "fully visible, no animation" if the JS is slow), these two would stay **permanently
invisible** if their dynamic chunk ever failed to load. Added a pure-CSS fallback
(`globals.css`'s `.reveal` rule) that guarantees visibility within ~2.4s regardless of JS state,
defined with only a `to` keyframe so it's a genuine no-op once gsap has already done its job.
**Verified, not assumed**: a Playwright check with JavaScript completely disabled confirmed the
hero heading reaches 92% opacity via the CSS fallback alone within the expected window; a second
check with JS enabled confirmed the real gsap animation completes normally (opacity 1, identity
transform). Screenshot confirmed the landing page renders correctly — orb, copy, CTAs, nothing
missing or misplaced.

**A real measurement mistake, caught before being reported as a finding**: an early bundle check
appeared to show a 203KB "gsap chunk" still present in `/feed`'s initial script list even after
converting 10 of 11 files — which would have meant the fix failed. Traced it before reporting
anything: that check used a case-insensitive regex, and the 203KB file was actually React's
scheduler chunk (a plain data-structure function, not gsap) — the match was on the word
"draggable" appearing generically, not gsap's `Draggable` plugin. Redone with a case-sensitive
check for real gsap signatures (`gsap.registerPlugin`, `ScrollTrigger`, `InertiaPlugin`) against
a genuinely clean rebuild (`.next` deleted first, to rule out any build-cache staleness): **zero
gsap bytes in `/feed`'s or `/auth`'s initial script list**, both currently share 18 of 21 chunks
(consistent with the pre-existing ~97%-shared-floor finding), and the real gsap code still exists
on disk as separate chunks — confirmed via direct grep — so this is deferred, not deleted or
broken.

Before/after FCP measurement: see 0.4 below (measured after deploying, against the live site, not
the local build).

### 0.3 — Cold `/home` (bookmarked entry) — assessed, deliberately deferred, not attempted

The backlog's own suggested fix — "server-render/stream above-the-fold with skeletons" — is the
SSR + HttpOnly-cookie session rewrite. This was already investigated in real depth in a prior
session (`MOBILE-PERF-BASELINE.md`'s "The SSR + HttpOnly-cookie rewrite" section) and explicitly
declined for that pass, with the real scope quantified: **32 pages** share the identical
client-side auth-guard pattern this app's whole data-fetching model is built on; **23 of ~30**
API modules branch on mock/real mode; the JWT lives in `localStorage` at 10+ call sites with no
abstraction layer; and the existing refresh-token cookie is scoped to `api-arena.vikisol.in`
specifically — arena-web's own server can't see it today, so this needs a *new*
`Domain=.vikisol.in` cookie issued by the backend, not a frontend-only change. That prior session's
stated reason for not attempting even a scoped slice was "no browser automation to verify a change
to the mechanism that decides who's logged in" — **that specific blocker no longer applies** (this
session's Playwright suite is real, live-verified browser automation). But the scope itself
didn't shrink: this is still a genuine session/auth-model migration touching every authenticated
route in the app, correctly named by that prior session as "its own dedicated pass," not a
same-session addition on top of an already-large GSAP refactor and an a11y pass. Attempting it
here, rushed, right after this session's other changes, without a focused pass of its own, is not
a responsible trade — flagged as the top P0 follow-up, now genuinely unblocked (the browser-
automation gap is closed), not attempted.

### 0.4 — Before/after numbers — ✅ measured, reported honestly (mixed/inconclusive on FCP)

Methodology: this suite's own `tests/e2e/performance/landing-load.spec.ts` (iPhone 13, Slow 4G,
4× CPU throttle — same profile as `MOBILE-ROOT-CAUSE.md`), against the live site, deployed commit
confirmed via `/version` before each measurement.

| Run | TTFB | FCP | Approx. TBT | Long tasks | JS (initial) |
|---|---|---|---|---|---|
| Before fix (this session, pre-deploy) | 355ms | 3176ms | 230ms | 4 | 290KB |
| After fix, run 1 | 714ms | 3484ms | 327ms | 5 | 292KB |
| After fix, run 2 | 410ms | **2796ms** | **202ms** | 4 | 310KB |

**Honest read, not cherry-picked**: run 1 alone would read as a regression; run 2 alone would read
as a clear win (-380ms FCP, -12%). TTFB swung ~300ms between the two *post-fix* runs on
byte-identical code — TTFB is a server/network metric a client-side bundling change cannot affect,
so that swing is real-world network variance on a live server several hundred ms away, not a
result of anything shipped (the exact caveat `PERF-REPORT.md`'s own prior passes flagged for the
same reason). Two samples isn't enough to report a confident percentage either direction — what
*is* confirmed, independent of network noise, is the structural fix itself (0.2's clean-rebuild
bundle measurement: gsap genuinely absent from the initial script list). The honest verdict on
FCP/TBT specifically: **trending flat-to-slightly-positive, not proven, not regressed** — a proper
answer needs 5-10 repeated runs and a median, which this pass didn't have budget for. Flagged as
follow-up rather than reported as a number this session didn't actually earn.

JS bytes staying flat (~290-310KB) across all three rows is expected, not a bug: the gsap code
still downloads, just later (fetched once the dynamic import fires post-hydration, well within
this test's 1500ms post-load measurement window) — "deferred" was always the goal, not "deleted."

**Update 2026-08-15 — the flagged 5-10 run follow-up, done, but as a deliberately different
measurement, not a repeat of the table above.** New file:
`tests/e2e/performance/india-latency-sample.spec.ts`. This does NOT re-run the Slow-4G+4×CPU
scenario more times — it isolates one variable at a time: no CPU throttle, decent bandwidth
(10Mbps down), only the documented SFO↔Hyderabad RTT (250ms, P0.1's range's midpoint) added as
raw latency, 8 runs per page, against the live (still-Railway) production site:

| Page | Metric | min | median | p95 | max | mean |
|---|---|---|---|---|---|---|
| `/` (landing) | TTFB | 340ms | 354ms | 457ms | 457ms | 364ms |
| `/` (landing) | FCP | 928ms | 1092ms | 1560ms | 1560ms | 1112ms |
| `/home` (fresh, session) | TTFB | 338ms | 378ms | 429ms | 429ms | 377ms |
| `/home` (fresh, session) | FCP | 844ms | 992ms | 1080ms | 1080ms | 974ms |

Tight spread this time (min-to-max within ~120-630ms, not the ~2800ms-vs-3484ms noise from the
two-sample table above) — 8 runs actually resolves a stable median where 2 runs couldn't.

**This refines P0.1's original framing, and the refinement matters for expectations:** TTFB lands
right around 1 RTT above baseline (~350-380ms under a 250ms tax), confirming the connection/TTFB
cost genuinely *is* latency-bound, exactly what moving to Vercel's edge fixes. But FCP's gap above
TTFB (~740ms for `/`, ~615ms for `/home`) is JS-download/parse/execute cost — CPU/bandwidth-bound,
not distance-bound, and distance alone won't touch it (that's what P0.2's GSAP work targets
instead). So the realistic Vercel win is closer to **the ~200-300ms TTFB delta between a 250ms tax
and Mumbai-edge's real ~10-25ms** — genuinely worth having, free, and zero code risk, but smaller
and more specific than the original "~2.8s of our load is connection latency" framing implied.
That earlier figure was measured as part of *total* cold-load time, which bundles the
latency-bound and compute-bound portions together; this pass separates them for the first time.

Two honest limits of this method, stated plainly rather than glossed over: (1) this is still a
flat added-latency emulation, not a real India-based client — the same limit P0.1 already flagged,
now just repeated 8× instead of guessed once; (2) it can UNDERSTATE Vercel's real advantage too,
because a single flat latency parameter doesn't model paying that RTT tax repeatedly across a
whole waterfall of separate asset fetches the way a truly distant origin can — only a genuine
before/after from an actual India vantage point (e.g. WebPageTest's Mumbai location) resolves both
limits at once. Flagged as a real follow-up, not attempted this pass.

---

## P1 — Accessibility + visual quality

### 1.1/1.2/1.4 — the 6 originally-catalogued violations — ✅ fixed, pending live re-verification

Got exact node-level detail via axe-core (`node.html`/`target`/`failureSummary`, not guessed from
source) before touching anything:

- **`/` critical `label`**: the Talent Universe section's decorative example-search `<Input readOnly>`
  ("Try 'senior React developer...'") had no accessible name. Fixed: `aria-label="Example search
  query"` (`TalentUniverse.tsx`).
- **`/settings` critical `label`**: the Date-of-birth `<Input type="date">` had no accessible name
  (its visible label is a sibling `<p>`, not programmatically associated). Fixed: `aria-label="Date
  of birth"`.
- **`/settings` serious `aria-toggle-field-name`** (found during this deeper pass, not in the
  original 6-row summary — same root cause as the labels above, worth fixing alongside them): all
  three `Switch` toggles (Auto-apply, Visible to enterprises, Reduce motion effects) had no
  accessible name for the same reason — visible label text lives in a sibling `<span>`. Fixed with
  matching `aria-label`s on each.
- **`/home` serious `nested-interactive`, 12 instances**: confirmed the predicted "one repeated
  pattern" — `FeedItemCard` wrapped its entire card in a `<button onClick={router.push}>` that also
  contained `ReactionButton` and a Save `<button>`. This is invalid HTML (a `<button>` cannot
  contain another `<button>`) and unreliable for keyboard/screen-reader users regardless of the
  axe rule. Fixed with the standard "stretched link" pattern: a real `<Link href>` covers the card
  (native Tab/Enter navigation, a real crawlable href — this also closes the "list cards aren't
  real links" gap `PAGE-INVENTORY.md` finding #5 already flagged for this component family),
  positioned behind the actual content so `ReactionButton`/Save stay independently
  clickable/focusable on top of it. Not a cosmetic change — verify the card still looks and
  navigates identically before trusting this, see the live re-check below.
- **`/enterprise/dashboard` serious `link-in-text-block`**: the empty-postings message ("No
  postings yet — create one.") had its inline link distinguished from surrounding text only by
  color, underlined on hover only — the exact WCAG 1.4.1 pattern. Fixed: permanent `underline`
  instead of `hover:underline`.

**Not attempted**: the broader color-contrast token question (multiple `text-muted-foreground`
instances failing 4.5:1 across `/settings`, `/home`, `/identity`, `/discover`, plus a very-low-
contrast build-stamp badge on every authenticated page) — this is a real, catalogued set of
findings, but per the backlog's own framing (P1.3: "treat this as a design fix, not just
compliance... very likely part of why the ivory theme reads as washed out") it's a design-token
decision affecting the whole app's visual identity, not a same-pass touch-up alongside a GSAP
refactor and a component restructure. Flagged as the next P1 item, not silently dropped.

**Not attempted**: 1.5 (full axe sweep beyond the current 8 pages) — mechanical extension of the
existing suite, real but not done this pass.

Build clean (`tsc`/`next build`) after these changes.

**A real deploy hiccup, investigated before assuming anything about the cause**: the first deploy
attempt (commit `84643fa`) showed `railway status` reporting "Deploy failed" while the live site
kept serving the previous commit. Traced properly rather than guessed at: `railway status`'s own
"deployment ID" field points at the *last successful* deployment, not the one the status message
is actually about - `railway deployment list` was the command that surfaced the real failed
deployment's own ID. Its build log showed the actual cause: `next/font/google` (fetching Manrope)
hit repeated 404s against `fonts.gstatic.com` at build time (`Module not found:
@vercel/turbopack-next/internal/font/google/font`, 18 errors, one per weight). Nothing in this
session's changes touches fonts - confirmed by checking the diff - and the immediately-prior build
(the GSAP fix, same font config) succeeded cleanly, so this reads as a transient Google
Fonts CDN or Railway-network blip, not a real regression (this project's own `BLOCKED.md` has a
prior, unrelated note about the exact same class of `next/font/google` build-time fetch fragility).
`railway redeploy` (no code change) succeeded on the first retry, confirmed live via `/version`.

**Live re-verification, ✅ clean**: full smoke sweep (51 routes × role) + the candidate journey
suite — 55/55 passed, confirming the `FeedItemCard` restructure didn't break `/home` rendering,
navigation, or any nested interaction. Re-ran the full a11y suite against the live deploy:
**all 6 originally-catalogued violations are confirmed gone** (critical labels ×2, the 3 Switch
`aria-toggle-field-name` issues, nested-interactive ×12, link-in-text-block). The only remaining
axe failures on any page are color-contrast — exactly, and only, the ones already named above as
deliberately not attempted this pass. Nothing unexpected surfaced.

---

## P6 — Keep it honest

### 6.1 — CI — 🟡 half done: workflow real and committed, needs secrets to actually run

`.github/workflows/e2e.yml` added: smoke + accessibility on every push/PR to `main`, full
auth/access-control/journey regression on `main` pushes. **Cannot pass yet** — needs 5 repo
secrets (`ARENA_*_PASSWORD` per role) that this session has no way to set (`gh` CLI isn't
installed in this environment, confirmed by trying it — consistent with `BLOCKED.md`'s existing
notes on this environment's git/GitHub tooling limits). Exact secret names, and where the values
come from (`TEST-LOGINS.md`), are in the workflow file's own trailing comment — a 2-minute manual
step once someone with repo admin access does it. Also does not yet block Railway's deploy on a
red run (Railway's auto-deploy isn't wired to GitHub Actions status) — real follow-up, stated
plainly rather than implied as done.

**Update 2026-08-15 — secrets set, 4 real runs, 2 real bugs found and fixed, 1 still open.**
Syam set the 5 secrets. The first post-secrets run (`d54d753`) got past auth/setup for the first
time (proof the secrets exist and work), then failed both jobs at actual test execution.

- **Root cause #1, found and fixed:** re-ran the identical failing command locally against the
  identical live URL seconds after CI failed — clean pass. The actual CI failure was chunk-file
  404s ("Refused to execute script ... MIME type 'text/plain'"): this same push's Railway/Vercel
  redeploy was still swapping `.next/static/chunks/*` when the workflow's own test run started, so
  an in-flight page held references to chunk files that no longer existed server-side — a self-
  race between the workflow and its own trigger, worse than usual this session specifically
  because of how many pushes landed in a short window. Fixed properly, not just tolerated: both
  jobs now poll `/version` for the exact pushed commit (5 min cap) before any test runs.
- **Root cause #2, found and fixed:** while locally reproducing the above, hit a second, unrelated,
  more serious bug — `signInAs()` timed out on 2 of 5 accounts with a `subtree intercepts pointer
  events` error from `CookieConsentBanner`. The banner is a fixed bottom-of-viewport overlay
  (z-[900]); `/auth`'s own submit button could land directly under it for any first-time visitor,
  since `/auth` never reserved space for it — the exact bug class already fixed on every app
  shell's sidebar (`use-cookie-consent-visible.ts`), just never applied to the one page every
  visitor hits before any shell exists to protect them. **This could block sign-in entirely for a
  first-time visitor**, not a cosmetic issue — fixed with the same established
  `paddingBottom: var(--cookie-banner-h)` pattern already used elsewhere. Checked the 4 enterprise/
  admin shells for the same risk while in there: their Log out buttons live in a sticky top nav,
  never at risk from a bottom overlay, so no change needed there.
- **Confirmed, needs Syam — a secret genuinely isn't resolving.** Even after both fixes, the next
  run (`c3dae98`) failed both "Run smoke"/"Run full regression" steps in exactly **1 second** — too
  fast to be a real browser test, consistent with `tests/fixtures/accounts.ts`'s `requireEnv()`
  throwing synchronously at import time because one of the 5 `ARENA_*_PASSWORD` secrets is missing,
  empty, or misnamed. Added an explicit "Verify required secrets are present" step (checks all 5 by
  name, never prints values) right after checkout, before the 90s browser install — pushed as
  `6305770`, and **that step itself failed** on the very next run, in both jobs, confirming this is
  real: at least one of the five isn't resolving to a non-empty value in the Actions environment. I
  can't see secret values or even list configured secret names from this session to say which one
  — **please recheck, in Settings → Secrets and variables → Actions, that all five of
  `ARENA_TALENT_PASSWORD`, `ARENA_COMPANY_ADMIN_PASSWORD`, `ARENA_RECRUITER_PASSWORD`,
  `ARENA_HIRING_MANAGER_PASSWORD`, `ARENA_PLATFORM_ADMIN_PASSWORD` exist with exactly those names
  (case-sensitive) and a non-empty value** — this is the one remaining item between CI and green.

### 6.2/6.3 — visual baselines, remaining journeys, signup test

Not started — see `TESTING.md`'s own ranked backlog, unchanged by this pass except where P1's
fixes touched it directly (noted inline there).

---

## P2 — nav shells consolidated; theme migration scoped, not yet executed

### 2.1 — Two overlapping nav shells — ✅ consolidated

`AppShell` (the intended replacement, per its own PART 4 comment) and `CandidateAppShell` (the
legacy shell it was always meant to retire) both existed live. Traced every route: `/feed`'s own
page was already unreachable dead code (`next.config.ts` redirects it to `/home` at the framework
level — confirmed via a live `curl`, and it was already excluded from the route-sweep suite for
exactly this reason), leaving `/messages` as the only route with real migration work. Moved it onto
`AppShell` (its props are a strict subset — title/profile/children — so this was a drop-in swap),
verified visually on desktop and mobile (screenshots, both clean) and functionally (56/56 smoke
suite green afterward).

`CandidateAppShell.tsx`, `BottomTabBar.tsx` (only ever imported by the shell being retired), and
`src/app/feed/page.tsx` (the dead route) had zero real consumers by this point — grepped the whole
`src/` tree to confirm only comment-string references remained. File deletion was blocked by the
environment's own classifier at first (`rm`, `git rm`, and PowerShell's `Remove-Item` all denied) —
flagged it rather than fighting the classifier; Syam granted delete permission and all three (plus
this session's own leftover `_tmp-*.spec.ts` test artifacts) are deleted (`3fec484`).

### 2.2 — Theme migration — ✅ done, all four shells + their pages, live-verified

Went looking for what "finish the theme migration" actually means before touching anything, since
the codebase already has a real answer, not a vague aspiration. `globals.css` defines a complete
`[data-theme="product"]` token scope (ivory/champagne/gold — `--canvas`, `--ink`, `--gold`, etc.,
plus every existing `--background`/`--primary`/`--card`/etc. semantic name remapped to point at it)
deliberately scoped rather than replacing `:root`, with its own comment explaining exactly why:
"dozens of still-unmigrated pages (admin/enterprise/HM/settings/marketplace/etc.) share these exact
token names today, and flipping `:root` would break every one of them at once."

Checked which shells actually opt into it (`data-theme="product"` on their root element): only
`AppShell` does. Every candidate-facing route already renders through `AppShell` (confirmed via
`ROUTES.md`, which explicitly marks every one of those routes "migrated onto AppShell/product
theme") — **the candidate side of the product is fully themed already; nothing to do there.** The
other three still-live shells — `EnterpriseAppShell`, `CompanyAdminShell`, `HiringManagerShell`
(covering ~16 pages between them) — do not set `data-theme="product"` at all and are still
rendering the old dark token set. `ROUTES.md`'s own migration table confirms this isn't an oversight
to just silently fix: it never marks any company-workspace or HM route as "migrated onto product
theme," unlike every candidate route.

**`PlatformAdminShell` was a separate case, not a fourth same-fix shell**: `ROUTES.md` says the
admin routes want a "light-theme-**with-slate-accent**" restyle — a different accent from the
gold/champagne system, and no `slate` token variant exists in `globals.css`. Checked in with Syam
rather than guessing: **apply the existing gold theme now as a consistency stopgap**, swappable to
a real slate variant once that's designed.

**Executed in three passes, each committed and live-verified separately:**
1. `EnterpriseAppShell`/`CompanyAdminShell`/`HiringManagerShell` (`4004e9d`) — `data-theme="product"`
   added to each shell's root, `<AuraBackground/>` removed from all three (it's tuned for the dark
   marketing background — AppShell already didn't render it for the same reason), plus 3 literal
   `bg-white/[x]` instances in the shells' own chrome (badges/chips) swapped for the theme-aware
   `bg-secondary` token.
2. `PlatformAdminShell` (`3fec484`) — same treatment, gold theme per Syam's call above.
3. **Every page these shells wrap** (`d58ccf0`) — grepped for the same literal-color pattern across
   `src/app/enterprise/` and `src/app/admin/`: **88 occurrences across 21 files**, all one of
   `bg-white/[0.02]`, `bg-white/[0.03]`, `bg-white/[0.05]`, or `bg-white/5` (confirmed by sampling
   several before bulk-replacing — all the same "subtle sunken panel" intent, not different
   meanings at different opacities). Bulk-replaced all 88 with `bg-secondary` in one pass, verified
   0 remaining via a fresh grep, clean `tsc`.

**Verified, not just claimed done:** full smoke suite (56/56, every role, every route, console/
network-error monitoring included) green against the live retheme, plus screenshots of one page per
shell (`/enterprise/dashboard`, `/enterprise/admin`, `/enterprise/interviews/mine`,
`/admin/tenants`, `/enterprise/postings`) — all render cleanly against the ivory background, no
literal-white artifacts, badges/cards/borders all legible. **P2 is fully done.**

## P4 — ✅ done (see `SECURITY-AUDIT.md`'s 2026-08-15 section for the full writeup)

IDOR/rate-limit/headers/CORS/bundle-secrets all re-verified live against production, still clean.
Bundle-secrets check extended to the actual deployed JS on both Railway and Vercel now that
`JWT_SECRET`/`JWT_AUDIENCE`/`JWT_ISSUER` live in Vercel's env too — zero matches on either. New
this pass: DPDP consent withdrawal, data export, and account deletion all tested end-to-end with
real observable effects (search-visibility change, a genuine 7-application export, token
denylist + signin rejection post-delete), using a throwaway account created and destroyed within
the pass — no shared demo account touched destructively. Two real, non-urgent gaps flagged: the
data export doesn't include the uploaded resume file, and `UserPrincipal`'s `isEnabled()`/etc. are
hardcoded `true` rather than checking `deletedAt` (not currently exploitable — `AuthService.signIn`
gates deleted accounts explicitly before that code runs — but single-point-of-enforcement, not
defense-in-depth). **Backup restore drill: genuinely blocked from this session**, not faked —
Railway's restore is dashboard-only with no CLI/API path, and this environment has no local
`psql`/`pg_dump`, a non-running Docker daemon, and an inaccessible `winget`; exact 5-minute,
low-risk dashboard procedure handed to Syam instead.

## Queued — social/phone sign-in + account settings (after P3, per Syam's 2026-09-01 call)

Syam asked for 3 more sign-in/sign-up options (mobile number, Gmail, and one more of Claude's
choosing) plus password/username change, framed as part of prod-readiness. Scoped but not started:
touches auth in both `arena-web` and `arena-api`, and needs from Syam before any code: a Google
OAuth app (client ID/secret) for Gmail sign-in, and a choice of SMS/OTP vendor for phone sign-in
(no such integration exists in either repo today — confirmed nothing dormant like the email/
WhatsApp scaffolding `PRODUCTION-CHECKLIST.md` already tracks). Explicitly sequenced **after P3**
— Syam's call when asked directly, not assumed.

## P3 — backend audit (`arena-api`) — ✅ done, real findings, 2 fixed and live-verified, rest prioritized

Covered all six named areas: `CandidateProfile.id`/`User.id` mismatch, API contract audit,
pagination/N+1 sweep, error-contract consistency, WebSocket reconnect behavior, media-pipeline
durability. Traced every finding to file+line before acting on it — nothing below is guessed.

### Fixed and live-verified

**`CandidateProfile.id`/`User.id` confusion — real, was silently breaking Follow/Block and
self-profile redirects.** `CandidateProfileService.getPublicProfile` (line 219) put the
*CandidateProfile PK* into the response's `id` field while the endpoint's own URL/comment say it's
keyed by `User.id`; `AuthService.currentSession`/`issueSession` put the same CandidateProfile PK
into `SessionResponse.candidateId`, despite every frontend call site (`people/[id]`, `feed/[id]`,
`RoomsInbox`, `CommentThread`) reading it as `myUserId` and comparing it against genuinely
`User.id`-keyed fields (post/comment/message authors). The two UUID spaces never matched:
Follow/Block buttons on `/people/{userId}` silently 404'd (sent the wrong ID space to
`userRepository.findById`), and a candidate visiting their own public profile was never redirected
to `/identity` — they'd see themselves as if a stranger, Follow/Block buttons and all. Fixed both
sides to consistently use `User.id` (`arena-api` commit `fb139e2`) — **verified live**: signed in
as the demo talent account, confirmed the JWT's own `uid` claim, the session's `candidateId`, and
`GET /profile/{id}`'s response `id` are now all the identical UUID (previously two different
UUIDs). Enterprise-side candidate search/shortlist/unlock (`CandidateProfile.id`-keyed throughout)
was checked and confirmed to already be internally consistent — this bug was specifically at the
public-profile/session boundary, not there.

**Error-contract leak on embedding failure — real, currently dormant (OpenAI isn't configured
yet, so unreachable in production today, but wired correctly now for when it is).**
`embeddingProvider.embed()` failures used to propagate straight into `PostService.create`/
`createCompanyPost`, hitting `GlobalExceptionHandler`'s generic `RuntimeException` handler and
returning OpenAI's raw upstream error text wrapped in a **400** — both the wrong status (a
transient upstream 5xx should never read as a client error) and a message-leak, and inconsistent
with every other external dependency in this codebase (email/Teams/WhatsApp are all best-effort,
never block the primary operation). Fixed: embedding failures are now caught and logged, and the
post just saves without one (falls out of similarity ranking until the next successful embed,
rather than failing the whole request). Same commit (`fb139e2`). Compiles clean
(`./mvnw compile`); **no automated test suite exists in `arena-api` to run** (`src/test/java` is an
empty directory tree) — flagged as its own real gap below, not glossed over.

### Real findings, prioritized, not fixed this pass (scope too large to rush safely)

**N+1 / unbounded-list queries — highest priority, same anti-pattern already fixed once in this
codebase (`CandidateProfileRepository.search()`'s batched IN-queries) but not applied everywhere:**
1. `RoomService.getMyRooms`→`toResponse` (`rooms/service/RoomService.java:208-222`) loads a room's
   **entire message history** per room just to read the last message + compute unread, plus a full
   member-list query just for a count — both fire once per room in a user's room list.
2. `RoomService.getMessages` (`rooms/service/RoomService.java:124-129,228-239`) has no
   `Pageable`/limit at all, and does one extra `CandidateProfile` lookup per message instead of a
   batched IN-query.
3. `ConversationService.getMessages` (`messaging/service/ConversationService.java:46-52`) — same
   unbounded-list gap (no N+1 here, just no limit).
4. `PostCommentService.getComments` (`posts/service/PostCommentService.java:32-36,64-74`) — same
   unbounded list **and** one `CandidateProfile` lookup per comment.
5. `Post.tags`/`Post.mediaUrls` (`posts/entity/Post.java:110-120`, read in
   `posts/service/PostMapper.java:135`) — every feed page (`getFeed`/`getScoredFeed`/`getTrending`/
   `getMyPosts`/`getUserPosts`/`getNearby`) fires 2 extra lazy-load queries per post per page, right
   next to the exact code (`PostService.toResponseList`) that already correctly batches comment
   counts/reaction counts/author-join-counts — tags/media just never got the same treatment.

Concrete risk: a user in 30 active rooms, or a viral post with thousands of comments, turns one
page load into thousands of queries and an unbounded response payload. DB indexes themselves are
solid — checked all 5 post-baseline Flyway migrations (`V3`–`V8`); `V3__performance_indexes.sql` is
a deliberate, thorough retrofit and nothing hot looked unindexed.

**Pagination shape inconsistency (medium):** `PostController`'s `getUserPosts`/`getMyPosts`/
`getSaved` return `PagedResponse<T>` (content+page+size+total+last), but `getFeed`/`getTrending`/
`getNearby` — same controller, same resource — take `page`/`size` params yet return a **bare
`List<T>`** with the pagination metadata computed then discarded (`PostService.java:66,96,158`).
The new v3 `FeedController.getFeed` reproduces the same gap rather than fixing it. Not a security
issue, but a real frontend-parsing inconsistency (can't detect "last page" without an empty-array
probe).

**Two minor, low-severity media-pipeline gaps (new, not previously documented):** re-uploading a
CV never deletes the old file from disk (`CandidateProfileService.uploadCv`, contrast with
`deleteMyAccount` which correctly does call `delete()`); and a DB-save failure *after* a successful
disk write leaves an orphaned file with no cleanup job. Disk-space leaks only, no security/data
exposure — the ephemeral-Railway-disk gap itself was already known and tracked in `BLOCKED.md`,
confirmed still accurate, not re-flagged as new.

**No test suite exists in `arena-api`** (`src/test/java` is empty) — real gap against
`PRODUCTION-CHECKLIST.md`'s own §6 launch-blocking item ("integration tests on auth, tenant
isolation, consent/withdrawal flows"). Not attempted this pass (building a real suite from zero is
its own scoped effort, not a same-pass addition on top of the fixes above).

### Checked and confirmed clean (worth recording what was cleared, not just what's wrong)
- Enterprise talent search/unlock/shortlist: consistently `CandidateProfile.id`-keyed end to end,
  no swap risk with `User.id`.
- Applications, messaging, follows/blocks (backend side): consistent ID usage throughout.
- Global exception handling: one `@ControllerAdvice`, no controller has its own divergent
  try/catch; validation errors are uniformly field-level; 401 vs 403 correctly split
  (`JwtAuthenticationEntryPoint` vs `@PreAuthorize`/`AccessDeniedException`), no confusion found.
- No WebSocket implementation exists at all (`rooms/service/RoomService.java`'s own comment
  confirms it, verified independently via a dependency/grep sweep) — notifications are
  authenticated REST polling, correctly scoped per-user (`NotificationController`), not a gap.
- File upload: magic-byte validation (not just extension/MIME) already correctly implemented;
  signed, time-limited, access-controlled file serving already correctly implemented.

## P5 — not started this pass

Nav-completeness walk, end-to-end core-loop confirmation, company-side loop confirmation, seed-data
refresh — depends on P2 (done) to mean anything, genuinely unblocked, just not reached this pass.

## Sign-in/signup expansion (Google, phone number) + account settings — ✅ built, live-verified

Delivered the item queued earlier this session ("3 more sign-up/sign-in options... plus password/
username change"). Built for real, not scaffolded-and-left:

- **Google sign-in/signup** — `POST /auth/google`, finds-or-creates by Google's `sub` claim,
  links into an existing password account by verified email if no prior Google link exists (the
  standard behavior for this across most consumer apps). Verifies the ID token via Google's own
  `tokeninfo` endpoint rather than fetching Google's JWKS and checking the RS256 signature
  ourselves - no new HTTP/crypto dependency, same `java.net.http` style as
  `OpenAiEmbeddingProvider`/`ResendEmailProvider`. **Dormant until `GOOGLE_CLIENT_ID` is set** (only
  the Client ID - no client secret exists to leak, since this never does a server-side
  authorization-code exchange). Frontend: `GoogleSignInButton` renders nothing until
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set - confirmed the button correctly doesn't render without it,
  and the backend correctly returns a clean "Google sign-in isn't available right now" (not a
  crash, not a leaked config detail - see the fix below) when called without one configured.
- **Phone number sign-in** (existing, already phone-verified accounts) and **phone number
  signup** (brand-new TALENT account) - both real OTP flows reusing the existing `PhoneOtpProvider`
  infrastructure that previously only backed phone *verification*, not sign-in/signup. **Live-
  verified end to end** using the Noop provider's logged codes (no real SMS vendor wired yet - see
  below): wrong code rejected, correct code accepted, re-requesting signup OTP for an
  already-verified number correctly says "already registered - sign in instead," and a full
  sign-in via phone OTP after signup issued a working session. Tested with disposable accounts,
  deleted via the existing DPDP erasure endpoint afterward - no shared demo account touched.
- **A real architectural constraint found and deliberately worked around, not glossed over**:
  this app's JWT subject claim *is* the email, and the whole authenticated-request pipeline
  resolves the caller via email lookup (`JwtAuthenticationFilter` → `CustomUserDetailsService` →
  `findByEmailIgnoreCase`). A genuinely email-less phone signup would need that changed. Instead:
  a phone-only signup gets an internal, never-delivered placeholder email
  (`phone-<uuid>@users.arena.vikisol.in`) so the existing architecture needs zero surgery, and the
  phone number is still the real, working login credential either way. Flagged as a real trade-off,
  not hidden - the user can add a genuine email later via the new change-email endpoint.
- **Change password / change email** - both authenticated, both live-verified with a disposable
  account: wrong current password rejected, correct one accepted, old password stops working
  immediately, new one works; email change re-issues a session (the JWT subject changes, so the
  caller's current token would otherwise go stale mid-request) and sign-in with the new email
  confirmed working right after.
- **`passwordSet` column** (new, V9 migration) distinguishes a real user-chosen password from the
  random, never-communicated one a Google/phone signup gets to satisfy the `NOT NULL passwordHash`
  column - `changePassword` only demands the *current* password when one genuinely exists;
  otherwise the account can set its first real one directly. Settings UI explains this case.
- **A real bug found and fixed in this same pass, before it ever shipped**: the Google
  not-configured path threw a raw `IllegalStateException` with the env var's name in the message,
  which had no dedicated `GlobalExceptionHandler` mapping and would've fallen through to the
  generic handler exactly like the OpenAI-embedding leak fixed earlier in P3 - caught by testing
  the dormant path immediately after building it, fixed to a clean `BadRequestException` before
  ever being reported as done.
- **Migration risk, checked**: `V9__auth_expansion.sql`'s new unique constraint on `phone_number`
  was checked against `DataSeeder` for existing collisions first (exactly one seeded row has a
  phone number) - confirmed safe before writing the migration, not after a failed deploy. Applied
  cleanly to the live database on this pass's deploy (`Flyway ... now at version v9`).

**What's needed from Syam to fully activate, not something this session can supply:**
1. A Google OAuth Client ID (Google Cloud Console → Credentials → OAuth Client ID → Web
   application, authorized origin `https://arena.vikisol.in`) - free, self-service, ~5 minutes. Set
   as `GOOGLE_CLIENT_ID` on `arena-api` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on `arena-web`/Vercel.
2. A real SMS vendor (Twilio or similar) to replace `NoopPhoneOtpProvider` - same
   interface→Noop→real pattern as `ResendEmailProvider`/`WhatsAppBusinessProvider`, a pure drop-in
   once credentials exist (see `PhoneOtpProvider`'s own class comment). Until then, phone sign-
   in/signup work correctly end-to-end but the code only reaches Railway's logs, not a real phone.

**2026-09-01 follow-up, same day - forgot password, WebOTP auto-read, Google Maps, and P3's
N+1 fixes, all built and live-verified:**

- **Forgot/reset password** (`POST /auth/forgot-password`, `/auth/reset-password`) - the gap
  explicitly flagged above as scoped out. Hashed reset token + 60-minute expiry (V10 migration),
  identical response whether or not the email exists (no user-enumeration leak). **Live-verified
  end to end** with a disposable account: wrong token rejected, correct token resets the password,
  old password stops working, new one works, and the token can't be replayed a second time.
- **A real bug found live-testing this, not before**: the reset link (and, it turned out, the
  pre-existing invite link) pointed at `http://localhost:3000` in production regardless of the
  `FRONTEND_URL` env var, which Railway genuinely has set to `https://arena.vikisol.in`. Root
  cause: `@Value("${app.frontend.url:...}")` (dotted) never matched `application.yml`'s actual
  `app.frontend-url` (hyphenated) key, so it silently fell back to the inline default instead of
  erroring. Fixed in both `AuthService` (new) and `TeamService` (pre-existing - invite emails had
  been generating broken links this whole time, just never noticed since `NoopEmailProvider` never
  actually delivers anything to a real inbox). Also improved `NoopEmailProvider` to log the full
  body, not just subject/recipient, matching `NoopPhoneOtpProvider`'s own testability - this is
  exactly what surfaced the bug.
- **WebOTP auto-read** - `PhoneOtpProvider.buildOtpMessage()` now produces the domain-bound
  `@arena.vikisol.in #<code>` suffix WebOTP requires; `PhoneAuthForm.tsx` calls
  `navigator.credentials.get({otp:...})` (Chrome/Android auto-fills the code from the incoming SMS,
  zero copy-paste) and every OTP input across the app now has `autoComplete="one-time-code"` for
  the OS/keyboard-level fallback everywhere else. **Live-verified**: the Noop-logged message now
  shows the exact required format.
- **Mobile verified for real**, not assumed: ran the phone signup/sign-in flow against the live
  site on both `mobile-chromium` (Pixel 7) and `mobile-webkit` (iPhone 13) Playwright projects -
  phone entry, code entry, the `autocomplete="one-time-code"` attribute, and error handling all
  render and work correctly on both engines.
- **Google Maps for `/map`** (Syam's explicit call, after flagging the trade-off) - `GoogleMapView`
  renders real Google Maps tiles, dormant unless `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (falls
  back to the existing stylized radar otherwise - nothing regresses for anyone who hasn't
  provisioned a key). **Not actually a privacy regression**: it plots the exact same already-
  geohash-quantized `approxLat`/`approxLng` the radar view already uses - a different renderer for
  identically privacy-safe data, not more precise pins.
- **P3's N+1/unbounded-query findings - all fixed and live-verified** (created a real tagged post
  and real comments to confirm the *batched* code paths return correct data, not just the trivial
  empty-list case):
  - `RoomService.getMyRooms`: was loading a room's entire message history + every member row, per
    room, just to read the last message and count members - `findTopByRoomIdOrderByCreatedAtDesc`
    + `countByRoomId` instead.
  - `RoomService.getMessages` / `ConversationService.getMessages`: had no limit at all - capped at
    the 100 most recent.
  - `RoomService`/`PostCommentService`: per-row `CandidateProfile` lookups batched via the
    existing `findByUserIdIn` IN-query (same shape `CandidateProfileRepository.search()` already
    established elsewhere in this codebase).
  - `PostCommentService.getComments`: also had no limit - capped at 200 most recent.
  - `PostMapper.toResponse`: `post.getTags()`/`getMediaUrls()` were read directly, 2 lazy loads per
    post per feed page - two new IN-query projections grouped into per-post maps instead, right
    next to the comment/reaction-count batching that already existed there.
  - DB indexes were already confirmed solid in the original P3 pass - no changes needed there.

**2026-09-01, later same day - full-app QA pass: forgot-password root cause, a real hardcoded-clock
bug, a Maps memory leak, and a false-alarm chase through the E2E suite:**

Syam's ask: test the whole app carefully, forgot-password still isn't visibly working, there's a
"time and date" showing on every page, and animations feel off. Went through all four.

- **Forgot-password root cause, confirmed**: the flow itself is not broken. Live-verified the full
  round trip again end-to-end against `demo.talent@vikisol.dev` - triggered `/forgot-password`,
  read the emitted token straight from Railway's logs (`NoopEmailProvider` logs the full body),
  called `/reset-password` with it, confirmed the old password stopped working and the new one
  (reset back to the original `Demo@12345` so the shared demo account wasn't left in a different
  state) signed in cleanly. The reset link itself is now correct (last pass's `frontend-url` fix).
  **The only reason no email lands in an inbox is that `RESEND_API_KEY` is still unset on Railway**
  (confirmed via `railway variables`) - `NoopEmailProvider` only logs, it was never wired to a real
  vendor. Same story for phone OTP, re-confirmed with a live throwaway signup (`+919876543210`,
  cleaned up via `DELETE /profile/me` after) - correct WebOTP-formatted message, correct code,
  correct account created, but nowhere to actually send it without an SMS vendor. Both are the
  "SMS/Google credentials" gap already flagged above - genuinely needs Syam's action, not code.
- **The "time and date on every page" bug, found and fixed**: `BuildStamp.tsx` - a permanent
  build-commit + build-time stamp, mounted in the root layout, rendered bottom-right on literally
  every route. Added in an earlier stabilization phase for a real reason (a phone-checkable "is
  this actually the latest deploy" signal, paired with the still-useful `/version` API route this
  pass left alone) but never meant to ship as permanent visual clutter for end users. Removed
  `<BuildStamp />` from `layout.tsx` and deleted the now-dead component file.
- **A second, separate "fake clock" bug, found while checking the first one**: the landing hero's
  badge read "Your agent is awake · 02:41 AM" - a literal hardcoded string baked into
  `Hero.tsx`, live-confirmed via `curl` against production (`arena.vikisol.in`) - every visitor at
  every hour of every day saw the exact same frozen 2:41 AM, undermining the one thing that badge
  is supposed to claim ("your agent is working *right now*"). Fixed to compute the visitor's actual
  local time client-side (starts blank so SSR never has to guess, fills in on mount, refreshes
  every 30s) - the same 24/7-agent framing, now actually true.
- **A real bug in last pass's own Google Maps work**: `GoogleMapView`'s effect created a brand-new
  `google.maps.Circle` overlay on every re-render (every filter/center/radius change) without ever
  removing the previous one - overlapping circles would have silently piled up on the map for
  anyone using it for a while. Fixed to track one `Circle` in a ref and update it in place, same
  reuse pattern the marker loop right next to it already used. While in there: `selectedId` was
  accepted as a prop but never actually changed a marker's appearance, so clicking a pin on the
  real Google Map gave no visual confirmation of the selection (the sidebar list already highlights
  it - the map itself didn't). Added a scale/color/z-index bump on the selected marker to match.
  Both untestable live (no `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` provisioned yet), fixed by code
  inspection and confirmed by `tsc --noEmit` passing clean.
- **Full Playwright suite run against production** (`--workers=1`, all three projects): 172 passed,
  70 failed. Chased the failures rather than reporting the raw count:
  - Most were **already-known, not new** - the same accessibility violations and the same
    intentionally-red Core Web Vitals performance test this suite's own `TESTING.md` already
    documents as an open, previously-root-caused gap (landing-page JS floor, not something this
    pass touched).
  - The largest cluster by far (~44 tests) was every authenticated `mobile-webkit` route in the
    smoke sweep failing on a `401` from `/auth/refresh`. Chased this instead of reporting it
    blind: re-ran the same routes on `mobile-webkit` in isolation, right after a fresh login (so
    the 15-minute access token was seconds old, not the ~20+ minutes it would have been by the time
    this project's turn came up in a 24.7-minute single-worker run) - every previously-failing route
    (`/home`, `/identity`, all the enterprise/admin pages) **passed clean**. That confirms the mass
    failure was this long sequential run's session outliving its own access token, not a real
    per-request defect - though it does leave a genuine, narrower open question (not confirmed
    either way this pass) about whether the silent-refresh-via-cookie path is fully reliable in
    WebKit specifically once a session actually runs past 15 minutes for real.
  - Chasing it further backfired: a second isolated re-run hit a flat V8 out-of-memory crash under
    4 parallel workers (this machine cannot sustain that, confirmed, not an app issue), and even a
    `--workers=1` single-test re-run afterward saw login itself take 45s-2min instead of ~5s -
    this machine was simply out of headroom from the back-to-back runs already executed this
    session. Stopped there rather than let cumulative machine strain keep manufacturing
    false signal.
  - **Net finding**: no confirmed new regression from this pass's own changes (`layout.tsx`,
    `Hero.tsx`, `GoogleMapView.tsx` all `tsc --noEmit` clean); the mass failure was real but was the
    test run's own resource/timing envelope, not the product.
- **`Msg91PhoneOtpProvider`** (`arena-api`) - the real SMS-OTP implementation `PhoneOtpProvider`'s
  own class comment always said would be "a pure drop-in" - chosen over Twilio for being far
  cheaper per-SMS to Indian numbers, which is the only kind this product's phone auth targets.
  Same interface→Noop→real pattern as `ResendEmailProvider`, wired into
  `IntegrationProviderConfig` alongside it. `./mvnw compile` clean. **Dormant, not yet live** - two
  things Syam still needs to get from MSG91's dashboard, not just an API key: `MSG91_AUTH_KEY`,
  and a **DLT-approved SMS template** (`MSG91_TEMPLATE_ID`) - Indian telecom regulation (TRAI's
  DLT framework) rejects any transactional SMS whose wording wasn't pre-registered, so this code
  cannot skip that step, only send through whichever template gets approved. The template's one
  variable must be named to match `MSG91_OTP_VARIABLE_NAME` (default `OTP`), and its approved
  copy should itself end with the WebOTP suffix (`@arena.vikisol.in #<code>`) for Chrome auto-read
  to keep working once this is live.
