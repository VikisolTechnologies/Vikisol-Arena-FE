# AUDIT-REPORT.md — ARENA-DEEP-AUDIT.md, complete

2026-08-08/09. Six-phase pass against the deployed app (`arena.vikisol.in` /
`api-arena.vikisol.in`), which had already been live on its production custom domain for a
while. Standing order was diagnose-first, fix by severity, then architecture, then speed, then
security — this document is the final rollup; the phase-specific detail lives in `BUGS.md`,
`GAPS.md`, and `SECURITY-AUDIT.md`.

## Defects found and fixed

| # | Defect | Severity | Where | Status |
|---|---|---|---|---|
| 1 | Cookie-consent banner physically overlapped and intercepted clicks on the candidate sidebar's "Log out" button for every first-time visitor | High (blocks a core account action, not an edge case) | `CandidateAppShell.tsx` | Fixed, live-verified |
| 2 | Production domain (`arena.vikisol.in`) sent `X-Robots-Tag: noindex, nofollow` on every response since the day it went live — Google has never been able to index the site | High (business-impact) | `next.config.ts` | Fixed, deployed, verified gone from live headers |
| 3 | arena-web sent zero security response headers (`nosniff`/`X-Frame-Options`/`Referrer-Policy`/HSTS) — arena-api already sent all of these by default, arena-web (self-hosted, not on a platform with default injection) sent none | Medium | `next.config.ts` | Fixed (CSP deliberately deferred — see below), deployed, verified live |
| 4 | An entire session's commits (Phase 3-5 work) were pushed to the wrong git branch (`master`) instead of `main`, the one Railway deploys from | Process (would have silently stranded all of today's work, including fixes 1-3 above, off of production) | git config | Fixed — fast-forwarded `main` to `master`'s HEAD (no history rewritten), local branch renamed and re-tracked to prevent recurrence, deploy confirmed healthy |

## Confirmed non-issues (investigated, not fixed, because there was nothing to fix)

- `THREE.Clock` deprecation console warning — upstream R3F/three.js version-lag, no app-side fix exists, zero user impact.
- RSC prefetch `ERR_ABORTED` on enterprise dashboard — standard Next.js `<Link>` prefetch-cancel behavior, not app-specific, no user-visible surface.
- `GET /applications/{id}` returning 500 instead of 404 — the route doesn't exist server-side (frontend fetches the list and filters client-side); confirmed identical behavior for the legitimate owner and an unrelated user, so not an IDOR, just a minor error-code cleanliness item.
- Interview-by-application read returning the same response to an application's owner and an uninvolved candidate — confirmed both get an identical "nothing to see" response when no interview exists yet; nothing is actually being distinguished or leaked.

## Architecture / consolidation (Phase 3)

Built four shared primitives GAPS.md had flagged as duplicated, and migrated real call sites
against each — fully for three of them, a representative sample for the fourth:

| Primitive | File | Call sites migrated |
|---|---|---|
| Currency/date formatters | `lib/format.ts` | All ~21 (every one found) |
| Empty-state box | `components/ui/empty-state.tsx` | 12 of 14 (2 intentionally left — different, non-boxed visual pattern) |
| Auth-guard (`getSession`/`isOnboarded` redirect pair) | `lib/auth-guard.ts` | All 23 pages |
| Glass card surface | `components/ui/card.tsx` | 8 of ~25 (representative sample — this one needs manually pairing each JSX open/close tag, not a mechanical find-replace; remainder documented, not silently dropped) |

`knip` run clean afterward — none of the four new modules ended up orphaned, no new dead code
introduced by the migration.

## Performance (Phase 4 — interaction-lag, distinct from `v1.4-perf`'s page-load work)

- **3D pause-on-hidden**: re-verified by measuring actual WebGL `drawArrays`/`drawElements` calls
  (not raw `requestAnimationFrame`, which GSAP's own ticker also drives independently of the 3D
  scene and would have given a false "still rendering" read). Confirmed: 240 draw calls/2s while
  the tab is visible, 2/2s while backgrounded, 236/2s on resume. The `usePageVisible`/
  `frameloop` mechanism built in the prior performance pass genuinely works.
- **Interaction long tasks**: zero long tasks (>50ms) detected across four real interactions
  (agent chat typing, marketplace project-brief typing, discover swipe gesture, applications
  dialog open). Didn't just trust a clean-looking zero — independently verified the measurement
  method itself could actually detect a forced long task before trusting the app's result.
- **Request waterfalls**: found one real N+1-shaped pattern (`/applications` fires one parallel
  request per distinct applied-to job instead of a single batched fetch). Attempted the obvious
  fix (reuse the app's existing cached `getJobs()` bulk fetch) and caught, before committing it,
  that it silently drops job details for applications to postings that are no longer "open" —
  `getJobs()` filters server-side to open postings only, `getJob(id)` doesn't. Reverted. Left
  documented as a known minor inefficiency rather than trading a correctness regression for a
  small perf win.
- **Backend hot paths**: single-request timings for `/jobs`, `/applications`, `/profile/me`,
  `/marketplace/projects` (380-750ms) and one mutating `/applications` POST (1.4s) are consistent
  with `PERF-REPORT.md`'s already-documented, already-explained load-test baseline for this
  Railway tier — no new regression found.

## Security (Phase 5 — full detail in `SECURITY-AUDIT.md`)

Two of this session's four defects (production `noindex` leak, missing security headers) were
actually found here, since Phase 5's own header-checking step is what caught them via direct
`curl` against live prod responses — folded into the defects table above rather than duplicated.
Additionally:

- Re-ran `scripts/idor-check.sh` against the live deployed API: 9/9 passed. Extended coverage to
  candidate-side cross-account access (not in the existing script) — also clean.
- Rate limiting live-verified, not just read from config: 13 rapid login attempts against
  production correctly went 401×10 then 429×3.
- CORS live-verified: an untrusted origin's preflight correctly 403s; the app's own origin
  correctly gets a scoped `access-control-allow-origin`, not a wildcard/reflected one.
- `npm audit`: 2 of 4 findings resolved cleanly (`hono`/`nanoid`, dev-tooling-only transitive
  deps); the remaining 2 (`postcss`/`sharp`) require a Next.js version bump npm itself flags as
  outside the project's stated range — checked real exposure and confirmed zero attack surface
  for either (this app never uses `next/image`, and postcss here never processes anything but
  the app's own build-time source CSS), documented rather than force-upgraded.
- Backend dependency check (CVE-2025-41249, a real Spring Security authorization-bypass CVE in
  the Spring Framework version Spring Boot 3.3.0 resolves to) — confirmed the specific vulnerable
  code pattern (a class with unbounded generic type parameters carrying `@PreAuthorize`) doesn't
  exist anywhere in arena-api's source. Real exposure here is effectively nil. Spring Boot 3.3.x
  is now fully end-of-life, so a genuine fix means crossing multiple minor versions — documented
  as a recommended dedicated follow-up rather than rushed into this session.
- Upload validation re-confirmed at the code level: extension allowlist, size cap, and (the part
  worth calling out) actual magic-byte content fingerprinting — an attacker renaming a
  disallowed file to `.pdf` gets caught by content inspection, not just the extension check.

## Regression (Phase 6)

Smoke-tested every page this session's refactors touched, across three roles (candidate,
enterprise, platform_admin) plus the hiring_manager-specific page: zero console errors, zero page
errors, all correct HTTP statuses. Two apparent issues in the first pass both traced back to the
test script itself, not the app (a route that was never real in the page list, and a test account
with the wrong role for a `hasRole('HIRING_MANAGER')`-gated page) — verified the second one
against the correct account before ruling it out, rather than assuming.

## What this pass did not cover (explicit, not silently dropped)

- ~22 admin/enterprise pages got route-sweep coverage (console/network/blank-page checks, clean)
  but not individual hand-click interaction testing this pass — see `BUGS.md`'s own scope note.
- The remaining ~17 Card-component call sites (see Phase 3 table above).
- A Content-Security-Policy for arena-web — needs its own report-only verification pass across
  every route before enforcing, given the 3D scenes this project's ground rules require staying
  intact.
- A Spring Boot version upgrade for arena-api — needs its own dedicated, separately-tested pass;
  current exposure confirmed non-exploitable in the meantime.
- Full penetration testing of business logic beyond IDOR/auth/rate-limit/CORS/headers (e.g. bid
  placement race conditions) — Razorpay/escrow is still a documented pre-existing scope decision
  per `GAPS.md`, not a live payment surface to test.

## Ground rules honored throughout

No 3D scene was deleted, flattened, or replaced with a permanent static fallback at any point
this pass — the Phase 4 3D-pause work only verified existing behavior. HRLMS production was never
touched. No live credential was rotated (the one credential rotation earlier in this project's
history predates this mission and is unrelated). Commits were kept small and per-fix throughout,
per this mission's own standing order.

**Tagged `v1.5-hardened` on both `arena-web` and `arena-api`.**
