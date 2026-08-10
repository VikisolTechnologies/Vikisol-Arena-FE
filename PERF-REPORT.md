# PERF-REPORT.md — ARENA-PERF-AND-MOBILE-FIX.md, combined Track A + B result

## Sequencing note, stated honestly

Track A's fixes (see `MOBILE-BUGS.md`) landed and were deployed *before* Track B's baseline
measurement was taken — the critical fixed-position bug in particular would have made any
"the app feels janky/broken on mobile" perception impossible to separate from a genuine perf
number, so it made sense to fix and verify that first. This means `PERF-BASELINE.md`'s numbers
are already "post-Track-A" — there is no separately-measured "before Track A" perf baseline to
diff against, because Track A's bugs were correctness bugs (things not working at all), not
things that would show up as a specific millisecond delta in FCP/LCP. What follows is the real
before/after that *does* exist: Track A's own qualitative before/after (broken → working,
verified live both ways), and Track B's single measured baseline plus what was fixed based on it.

## Track A — before/after (full detail in MOBILE-BUGS.md)

| Finding | Before | After (verified live) |
|---|---|---|
| Cookie banner vs. mobile nav bar | Nav bar fully covered, untappable, on every migrated screen | Adjacent, zero overlap (`y:549.0` both edges) |
| GSAP transform leak breaking `position: fixed` app-wide | Nav bar + persistent orb scrolled away with page content after the first client-side nav (measured ~9974px down a page) | `transform: none` after 2 real navigations; nav/orb both back at sane viewport-relative coordinates |
| React/Save tap targets | 14×14px | ~40px tappable area (invisible hit-area expansion, same visual size) |
| 10 shared components (FollowButton, PostComposer, IntentCardView, etc.) | Marketing-only `ghost-glass`/`primary-gradient` variants - invisible fills or a hardcoded orange shadow glow on ivory screens | Theme-safe `outline`/`default` variants, correct on both themes |
| `PersistentOrb` | Invisible `bg-white/[0.04]` fill, hardcoded orange glow (violated the design system's own "zero neon orange" rule) | `bg-card`, `--gold`-based glow |

## Track B — baseline (full detail in PERF-BASELINE.md)

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

## Click-to-render (interaction timing, not in the original baseline table)

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

## What was fixed vs. what's real, scoped follow-up

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
