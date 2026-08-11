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

**Minor, secondary observation — not chased to a root cause, flagged for Phase 1.4/2:**
`/home`'s cold load fires `GET /profile/me` **twice** (255ms and 1127ms) for one page view,
alongside one `GET /feed`. Not the dominant cost (both calls are fast individually, `/home`'s
totals already meet target), but it's a real duplicate network round-trip worth folding into the
"one batched feed request" checklist item in 1.4 rather than a separate investigation.

## What this doesn't yet cover

`WebVitalsReporter` is live and correctly reporting, but no real third-party device has hit the
site since it shipped minutes ago — everything in this table is lab-measured or self-generated
via the lab runs. **Syam's own phone has not yet been checked against this instrumentation.**
Recommend he open `arena.vikisol.in` once on his usual connection; `railway logs --service
arena-web | grep web-vitals` will show real numbers within seconds, filterable by his session.
Until then, this report's confidence is "strong lab evidence, cross-checked two ways," not "field
confirmed."

## Fix plan (Phase 1.4, next)

In impact order, targeting contributor #1 (the only code-addressable one):
1. Bundle-split the landing page: defer below-the-fold sections' JS (keep their HTML server-
   rendered, load their interactivity/animation JS on viewport-entry or `requestIdleCallback`
   rather than in the critical initial bundle).
2. Re-check GSAP's import scope (152 KB uncompressed across 2 chunks) — confirm it's still
   submodule-narrow per the prior pass's finding, not a regression.
3. Fold the duplicate `/profile/me` call on `/home` into the existing "one batched feed request"
   checklist item.
4. Re-measure identically (same throttle profile, same scenarios) and report before/after here.

Not attempting #2 (connection-latency) as code work — infra-only, noted for awareness, not a
same-pass fix per the mission's own instruction to say so with numbers instead of code-thrashing.
