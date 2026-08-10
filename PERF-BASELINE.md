# PERF-BASELINE.md — ARENA-PERF-AND-MOBILE-FIX.md Track B

Measured against the live deployment (`arena.vikisol.in`), after every Track A fix had already
shipped (see `MOBILE-BUGS.md`) — in particular after the critical GSAP fixed-position fix, since
that bug would have made any perceived-"laggy nav" complaint impossible to separate from a
genuine perf issue.

## Method

Playwright + CDP, iPhone 13 device profile (390×844, DPR 3). Custom throttle profile (not a named
DevTools preset, chosen to approximate a real mid-tier phone on a weak connection and documented
here rather than left ambiguous): **1.5 Mbps down / 0.75 Mbps up / 300 ms RTT, 4× CPU
slowdown**. Metrics captured via the Performance API — `navigation`/`paint` entries for
TTFB/FCP, a buffered `PerformanceObserver` for LCP/CLS/long tasks (Total Blocking Time is
approximated as Σ(long task duration − 50 ms), not Lighthouse's exact TBT algorithm — flagged
honestly rather than presented as identical). TTI is **not** computed — a faithful TTI needs
Lighthouse's full network-quiet/CPU-quiet-window algorithm, which this script doesn't reimplement;
FCP/LCP/TBT below are the load-time signal instead.

Four scenarios: logged-out landing (`/`) and logged-in `/home`, each cold (fresh browser context,
empty cache) and warm (second load, same context).

## Results

| Scenario | TTFB | FCP | LCP | TBT (approx) | Long tasks | JS transferred | Total transferred |
|---|---|---|---|---|---|---|---|
| Logged-out `/` — cold | 452ms | **3984ms** | **5820ms** | 725ms | 9 | 294KB | 459KB |
| Logged-out `/` — warm | 242ms | 920ms | 1436ms | 163ms | 5 | 0KB (cached) | 8KB |
| Logged-in `/home` — cold* | 260ms | 744ms | 944ms | 279ms | 1 | 3KB | 11KB |
| Logged-in `/home` — warm | 233ms | 540ms | 716ms | 406ms | 3 | 0KB (cached) | 6KB |

\* "Cold" here means fresh navigation to `/home` for the first time in the session, but the
browser context had just completed the login flow immediately before (unthrottled, so it doesn't
pollute the throttled measurement window) — shared framework/vendor chunks were already warm in
cache from that flow. This is actually a fair representation of the real, common case (someone
who already has a session opening the app), just not a true "empty cache, first byte ever"
number for `/home` specifically — noted so the very low numbers aren't mistaken for
too-good-to-be-true.

## B2 — the auth waterfall

Checked directly: the login flow (`POST /auth/login` → cookie set → client redirect to `/home`)
happens once, outside the throttled measurement window. Once on `/home`, the only two calls made
are `GET /profile/me` and `GET /feed` — both real data calls, not a client-side "read a token
then redirect" chain. Step 1's server-resolved-session work (Edge middleware) is doing its job
here: no evidence of a client-side auth waterfall adding to `/home`'s own load time.

## B3 — bundle contents

Confirmed via a full resource capture of `/`'s cold load: **no Three.js/R3F chunk in the
landing page's initial load** — `AgentOrb` (the landing hero's animated orb) is a pure CSS+GSAP
component, not a canvas/3D one; `AuraBackground` is CSS gradients animated by GSAP, no canvas. So
the specific risk B3 names (a 3D/map library sneaking into initial JS) isn't present here. What
*is* present: ~900KB of uncompressed script across ~15+ separate chunks (294KB after compression)
— reasonably well code-split already (no single dominant monolith chunk), but the sheer count and
cumulative parse/hydrate cost under 4× CPU throttle is the more likely driver of the 725ms TBT
than any one identifiable offender.

## B5 — 3D render loops

`PersistentOrb`'s three.js scene already defers its mount to next-idle (see its own code comment
- confirmed not part of `/home`'s initial bundle, matching `jsBytesKB: 3` above). Not re-verified
with a full draw-call profile this pass — the code-level deferral is already in place and the
measured JS-bytes number is consistent with it actually working, which is the practical signal
that mattered here.

## Assessment

The logged-in product experience (`/home`, both cold-with-warm-shared-chunks and warm) is
comfortably within reasonable targets — FCP under 750ms, LCP under 950ms even under 4× CPU
throttle on a slow connection. **The one real standout is the logged-out landing page's true
cold load** (FCP ~4s, LCP ~5.8s) — a first-time, never-visited-before visitor on a slow phone.
That's the number worth improving, not `/home`.

Given B1's instruction to identify the single biggest contributor before changing code: this
isn't one fixable line, it's cumulative JS parse/execute cost across many chunks under heavy CPU
throttle, on the one page (the public landing page) that hasn't been through this session's
migration/cleanup work at all. A real fix here is scoped, real work — trimming the landing page's
own JS surface (lazy-loading below-the-fold sections, auditing whether every chunk currently
shipped is actually used above the fold) — not a one-line patch, and not something to rush
through blind in the same pass as Track A's critical fixes. Logged as real, scoped follow-up
rather than force-fitting a token change and calling it solved. See `PERF-REPORT.md`.
