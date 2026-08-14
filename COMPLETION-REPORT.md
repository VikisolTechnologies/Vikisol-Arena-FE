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
investigated and NOT executed, with a specific reason — see 0.1b. P0.4's flagged
5-10-run follow-up done — see 0.4's update. P2 (nav shell consolidation, then theme migration)
started next.

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

### 6.2/6.3 — visual baselines, remaining journeys, signup test

Not started — see `TESTING.md`'s own ranked backlog, unchanged by this pass except where P1's
fixes touched it directly (noted inline there).

---

## P2 — P5 — not started this pass, and why

Read in full before assuming any of this is close: **P2** (consolidate two overlapping nav
shells, finish theme migration across every screen, photography/media completeness, loading/
empty/error-state audit, a mobile app-feel pack) is real UI/UX work across dozens of screens.
**P3** is a *backend* audit (`CandidateProfile.id`/`User.id` mismatch, API contract audit,
pagination/N+1 sweep, error-contract consistency, WebSocket reconnect behavior, media-pipeline
durability) — it lives in a **separate repo** (`arena-api`) this session never opened. **P4** is a
security re-verification pass (IDOR suite, secret-in-bundle audit, rate-limit confirmation,
security-header/CORS check, DPDP consent/export/deletion flows, a real backup-restore drill) —
each of those needs to be *re-run live*, not assumed still true from `SECURITY-AUDIT.md`'s last
pass, and a botched backup-restore drill is not something to rush. **P5** (nav-completeness walk,
end-to-end core-loop confirmation, company-side loop confirmation, seed-data refresh) depends on
P2's shell consolidation being done first to mean anything.

None of these were touched. Not because they're unimportant — P3's backend audit and P4's security
re-verification are arguably higher-stakes than anything in P0/P1 — but because this session
already covered a full GSAP architecture change, a component restructure, and 6 real a11y fixes,
each shipped and live-verified rather than rushed. Per this project's own standing rule (and this
report's own opening line): an honest "not started, here's exactly why" beats a rushed pass through
five more phases that would need to be re-verified from scratch anyway. **Recommended next
session's scope: P2's shell consolidation first** (it's the one item P5 is blocked on), **or P4's
security re-verification** if that's the higher priority — both are real, scoped, ready to start
cold from this document.
