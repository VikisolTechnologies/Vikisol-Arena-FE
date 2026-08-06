# PERF-BASELINE.md — measured before ARENA-PERFORMANCE.md's optimization pass

Measured 2026-08-07 against the live production deployment (`arena.vikisol.in` /
`api-arena.vikisol.in`), via a real Chromium instance (Playwright + CDP), not a synthetic
estimate. Mobile profile: 390×844 viewport, 4x CPU throttle, ~Fast-3G/Slow-4G network
(1.6Mbps down / 750Kbps up / 150ms latency) via `Network.emulateNetworkConditions`.
Desktop profile: 1440×900, unthrottled.

**Measurement note**: `largest-contentful-paint` didn't resolve within the observation
window in this harness (reported as null below) — FCP, Total Blocking Time (via the
`longtask` PerformanceObserver, a reasonable proxy for TBT), and JS transfer bytes are the
numbers this baseline and the after-numbers are judged against instead. No Lighthouse CLI
or k6 available in this environment — see PERF-REPORT.md for the substitutes used.

## Landing page (`/`, unauthenticated)

| Metric | Desktop | Mobile (throttled) |
|---|---|---|
| FCP | 4504 ms* | 3096 ms |
| DOMContentLoaded | 4567 ms* | 1283 ms |
| Long tasks | 3 | 12 |
| Approx. Total Blocking Time | 281 ms | **1776 ms** |
| JS transferred | 312.5 KB | 295.0 KB |
| Total transferred | 455.7 KB | 430.0 KB |

*Desktop was the first request in the run (cold Next.js render cache) — its FCP/DCL are
inflated by a server-side cache miss, not representative of steady-state. Mobile ran
second, against an already-warm cache, isolating the CPU-throttle effect more cleanly —
which is exactly what shows up: the network transfer is barely different between profiles
(430KB vs 456KB), but mobile racks up **1776ms of main-thread blocking time** across 12
long tasks purely from JS execution on a throttled CPU. This is the core mobile problem:
not bytes over the wire, execution cost once they arrive.

## Dashboard (`/dashboard`, authenticated, talent role)

| Metric | Desktop | Mobile (throttled) |
|---|---|---|
| FCP | 528 ms | 776 ms |
| Long tasks | 4 | 6 |
| Approx. Total Blocking Time | 595 ms | 882 ms |
| JS transferred | 252.8 KB | 15.9 KB |

The 15.9KB mobile figure already reflects the same-day mobile-lag fix (WebGL orb quality
tiering, see DECISIONS.md) landing before this baseline was taken — desktop's 252.8KB is
close to exactly what the Three.js/R3F/drei chunk (887KB uncompressed, ~250-280KB
compressed — see bundle breakdown below) costs on its own, confirming it dominates this
page's entire JS budget on desktop.

## Bundle composition (local production build, `.next/static/chunks`)

| Chunk (by content) | Uncompressed | Routes that load it |
|---|---|---|
| `@react-three/fiber` + `drei` + `three` | 887 KB | Only authenticated app-shell routes (dashboard, applications, etc. — via PersistentOrb) and `/agent` — **confirmed NOT loaded on the public landing page** |
| GSAP + ScrollTrigger | ~214 KB | Landing page only (legitimate — scroll-reveal animations across Hero/OvernightReport/TalentUniverse/OpenMarket) |
| React + ReactDOM + Scheduler (framework baseline) | ~564 KB | Every route (unavoidable) |

Total landing-page JS transfer (312.5KB compressed) is consistent with framework baseline
+ GSAP only — Three.js correctly never loads there. This was already true before this
pass; not a fix, a confirmed-good starting condition.

## Backend (arena-api)

Already fixed same-day, prior to this mission: 11 N+1 query patterns + missing indexes
across marketplace/talent-search/jobs/interviews/audit/platform-analytics (see
DECISIONS.md's "perf: fix N+1 queries..." commit). This baseline treats those fixes as
already-in-place floor, not something ARENA-PERFORMANCE.md re-does — its own Step 6 is
about *load-testing* what's there now, not re-finding the same issues.

## What "after" needs to beat
- Mobile landing-page TBT: **1776ms** → target a meaningful reduction (this is the number
  most directly tied to "the page itself is not loading" / visible mobile lag).
- Confirm dashboard mobile JS stays low without removing any 3D scene (quality-tiered, not
  cut — see DECISIONS.md's correction entry).
- Bundle composition: Three.js chunk must still never load on the landing page after any
  further change.
