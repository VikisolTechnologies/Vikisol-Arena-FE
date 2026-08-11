# MOBILE-ROOT-CAUSE.md — ARENA-STABILIZE.md Phase 1 (2026-08-12)

Measured against **currently-live, Phase-0-verified code** (`arena-web` commit `a614a9a`,
confirmed via `/version`) — not against whatever was live before the deploy pipeline got fixed.
This matters: `PERF-REPORT.md`'s prior passes may have been judged against stale deploys; these
numbers are not.

## Methodology

Two independent sources, cross-checked against each other:

1. **Lab**: headless Chromium via Playwright/CDP, `iPhone 13` emulation (390×844), against
   `https://arena.vikisol.in` live. Throttle profile — **"Slow 4G"**, documented explicitly since
   it isn't a single universal DevTools preset name: RTT 150ms, 1.6Mbps down / 750Kbps up (the
   commonly-cited Lighthouse mobile default), **4× CPU slowdown**. Cold = first navigation in a
   fresh browser context; warm = second navigation, same page, connection/cache warm. Logged-in
   scenario authenticates unthrottled first (login isn't what's being measured), then re-applies
   throttling before the measured navigation.
2. **Real-device (production)**: the new `WebVitalsReporter` (Phase 1.1, live since commit
   `a614a9a`) reporting actual `TTFB/FCP/LCP/CLS/INP` from real page loads to `/api/vitals`,
   logged to Railway's stdout. The numbers below include entries logged from my own lab runs
   (confirming the two measurement methods agree) — no real third-party mobile traffic has hit
   the site yet since this shipped, so it's not yet validated against **Syam's own phone**. That
   remains open; see "What this doesn't yet cover" below.

## The numbers

| Scenario | TTFB | FCP | LCP | CLS | Approx. TBT | JS transferred | Feed visible |
|---|---|---|---|---|---|---|---|
| `/` logged-out — **cold** | **2842ms** | **5888ms** | **7140ms** | 0 | **1425ms** (9 long tasks) | 299 KB / 21 chunks | n/a |
| `/` logged-out — warm | 335ms | 692ms | 1432ms | 0 | 172ms | 0 KB (cached) | n/a |
| `/home` logged-in — cold | 285ms | 492ms | 704ms | 0 | 271ms | 3 KB | **1476ms** |
| `/home` logged-in — warm | 255ms | 492ms | 612ms | 0 | 184ms | 0 KB (cached) | 1412ms |

Google's own Core Web Vitals thresholds (via the real `WebVitalsReporter` instrumentation, same
runs): landing-page cold load rates **"poor"** on TTFB, FCP, and LCP. Every `/home` metric rates
**"good."**

Real unthrottled server TTFB (direct `curl`, no simulated network latency, 3 attempts):
370–520ms total, ~130–220ms to TLS handshake complete. Confirms the server itself responds
quickly — the 2842ms cold TTFB above is not a backend slowness finding.

## Top contributors, ranked

**#1 — DOMINANT: client-side JS parse/hydrate blocking first paint on the public landing page's
cold load.** Classification: **(c) client work.** 970 KB uncompressed / 299 KB compressed across
21 chunks, causing ~3046ms of FCP time *after* TTFB (5888ms FCP − 2842ms TTFB) and 1425ms of
main-thread blocking across 9 long tasks under 4× CPU throttle. This is the same issue
`PERF-REPORT.md`'s Pass 2 already diagnosed and explicitly left unfixed ("cumulative JS parse/
hydrate cost across ~15+ chunks (294KB compressed)... a real fix is a scoped bundle-splitting
pass... genuine work, not a same-pass patch") — now re-confirmed against genuinely-current code,
not stale. Chunk inspection: the two largest chunks (334 KB uncompressed combined) are React/
Next.js framework runtime; two more (152 KB uncompressed combined) contain GSAP. No Three.js/
map chunk loads on landing — confirmed still excluded, matching the prior pass's finding, no
regression.

**#2 — Connection-establishment latency under Slow 4G, landing page only.** Classification:
**(b) network payload/path**, not a code defect. Cold TTFB is 2842ms vs. 335ms warm on the exact
same page with zero code difference — the delta is DNS + TCP + TLS handshake round-trips under
150ms simulated one-way latency, confirmed non-server-side by the direct `curl` numbers above.
Real Slow-4G visitors genuinely pay this on every fresh connection; it isn't fixable by
application code, only by infra (CDN edge presence, HTTP/2 connection reuse — already in place
via Next's own serving — or moving compute closer to users). Flagging with numbers per the
mission's own instruction, not code-thrashing it.

**#3 — NOT a finding, stated for the record: `/home` itself is fast.** Every measured metric on
the actual post-login home route already meets the Phase 1.5 targets before any fix work: FCP
492ms (target <1.8s), feed visible at 1.48s (target <3s), TBT 271ms. The mission's own title
("mobile home slowness") primed an assumption that `/home` the route is broken — the measured
reality is that the **front door** (`/`, step G1 of the Golden Path, literally the first thing
any visitor or reopening user sees) is where the real, reproducible problem lives, not the feed
route. Reporting this plainly rather than force-fitting a fix onto a route that isn't the
bottleneck.

**Minor observation, investigated and resolved as a non-issue:** the cold `/home` run initially
looked like it fired `GET /profile/me` twice for one page view. Comparing against the warm
run (a second, clean navigation to `/home` well after login had settled) showed only one
`/profile/me` call there — so the second cold-run call isn't a per-load `/home` bug. It's
`signIn()`'s existing, already-documented `syncOnboardedFromProfile()` (`lib/api/auth.ts`), a
legitimate one-time post-login profile check that was still in flight when the test's response
listener attached, arriving late on the same page object after the client-side route change to
`/home`. No code change made for this — would have been fixing something that isn't broken.

## What this doesn't yet cover

`WebVitalsReporter` is live and correctly reporting, but no real third-party device has hit the
site since it shipped minutes ago — everything in this table is lab-measured or self-generated
via the lab runs. **Syam's own phone has not yet been checked against this instrumentation.**
Recommend he open `arena.vikisol.in` once on his usual connection; `railway logs --service
arena-web | grep web-vitals` will show real numbers within seconds, filterable by his session.
Until then, this report's confidence is "strong lab evidence, cross-checked two ways," not "field
confirmed."

## Fix plan (Phase 1.4)

Targeting contributor #1, the only code-addressable one. Chunk inspection found the actual
mechanism: `Starfield` (the canvas particle field behind the landing page's Talent Universe
section, below the fold) was starting its `resize()` + `requestAnimationFrame` draw loop —
O(n²) pairwise distance checks across up to 130 points, every frame — the instant it mounted,
regardless of scroll position. Pure wasted main-thread work competing with hydration before
it's ever visible, directly matching this mission's own Phase 1.4 checklist item ("canvases
mount post-paint, tier on mobile, pause off-screen/hidden").

**Fix**: new `useInViewport` hook (`src/hooks/use-in-viewport.ts`, IntersectionObserver-based,
same convention as the existing `usePageVisible`) gates `Starfield`'s draw loop to only run
once actually scrolled into view, and pause again if scrolled away. Zero visual change once
visible; the codebase already uses this exact "defer until interacted/visible" pattern
elsewhere (`AuraBackground`'s mousemove-gated dynamic import, `CountUp`'s ScrollTrigger
`onEnter`) — this closes the one component that didn't have it.

**Not changed**: GSAP itself (152 KB uncompressed) stays — `Hero.tsx` uses it directly for the
above-the-fold entrance stagger, so it's a genuine critical-path dependency, not dead weight to
strip in this pass. Re-checked its import scope; still submodule-narrow, no regression from the
prior pass's finding.

**Not attempting contributor #2** (connection-latency) as code work — infra-only, noted for
awareness, not a same-pass fix per the mission's own instruction to say so with numbers instead
of code-thrashing.

## Before → after (identical methodology, live, commit `f050237`)

| Metric (`/` logged-out, cold) | Before | After | Change |
|---|---|---|---|
| TTFB | 2842ms | 2785ms | -57ms (noise — unrelated to this fix, see contributor #2) |
| FCP | 5888ms | 5468ms | **-420ms (-7%)** |
| LCP | 7140ms | 6732ms | **-408ms (-6%)** |
| Approx. TBT | 1425ms | 1191ms | **-234ms (-16%)** |
| Long task count | 9 | 6 | **-3 (-33%)** |
| JS transferred | 299 KB | 316 KB | flat (expected — deferred *execution*, not code removed) |

`/home` (logged-in) was already meeting every target before this fix and stayed there — no
regression, numbers move within normal run-to-run noise (FCP 492→444ms, feed visible
1476→1356ms).

**Honest read**: this is a real, verified improvement — fewer and shorter long tasks, measurably
earlier paint — but it is not close to closing the gap to the <1.8s FCP target on landing's cold
load, because it only ever addressed the *client-work* half of contributor #1, and TTFB
(contributor #2, ~2.8s, infra-attributed) is untouched and now the clear majority of the
remaining time-to-FCP. Two things are still on the table for a genuine future pass, neither
attempted here: (a) further bundle-splitting of the landing page's framework/GSAP chunks — the
970 KB uncompressed total didn't shrink, only Starfield's *execution* moved later — and
(b) whatever infra lever (CDN edge, connection reuse) would address the TTFB delta. Both logged
here rather than the fix being oversold as "solved."
