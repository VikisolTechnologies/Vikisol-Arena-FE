# COMPLETION-REPORT.md — ARENA-COMPLETION-BACKLOG.md execution log

Living document, updated as each item completes. Working P0 → P6 in order per the backlog's own
instruction, but **not claiming completion of items not actually attempted** — an honest partial
pass beats a fabricated full sweep. This session's actual scope and why is stated plainly at each
checkpoint rather than silently assumed.

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

I have not done any of this — it's a real DNS/hosting change with real (if small) risk, and per
this project's own standing rule, infra changes like this get your explicit go-ahead rather than
being executed unilaterally. Say the word and I'll execute steps 1–3 (fully reversible, nothing
user-facing changes until DNS is repointed in step 4) and stop right before step 4 for your
confirmation.

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

### 0.3 — Cold `/home` (bookmarked entry)

Not started this pass — see assessment below once reached.

### 0.4 — Before/after numbers

Pending 0.2/0.3.

---

*(Sections below filled in as reached.)*
