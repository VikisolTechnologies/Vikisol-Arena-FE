# Performance pass (30 Sep 2026)

**Scope:** a production build (`next build` + `next start`) in production data mode
(`NEXT_PUBLIC_API_MODE=real`, `NEXT_PUBLIC_ARENA_DATA=api`). Screens: Feed, Discover, Activity
details, Work, You, the business pipeline, and Discover's map for MapLibre. Mobile Lighthouse 13
with simulated 4G and 4× CPU. Signed in, and the **median of 5 runs** per screen.

**Before** = `aa31bac`, just before this pass. **After** = this commit. Both builds were measured on the
same machine against the same stand-in API.

## How it was measured (reproducible)

- **The API.** `scripts/dev/perf-api.mjs` is a local stand-in API. Production mode needs a
  backend, and the preview world is no longer in the bundle. Photos are served the way
  production serves uploads: Cloudinary-style URLs, resized to the `w_` the app asks for, and
  cached like a CDN edge.
- **The screens.** `scripts/dev/perf.mjs` signs the browser in the way the app does
  (localStorage session) inside Lighthouse's own Chrome. It then runs Lighthouse through its
  Node API (installed outside the repo; point `LH_MODULES` at it).
  - It also records one real tap per screen with 4× CPU slowdown and takes the longest Event
    Timing entry. That stands in for INP, which a Lighthouse page load can't measure.
- **Route sizes.** `scripts/dev/route-js.mjs` reports first-load JS per route. Next 16 no longer
  prints sizes, so this reads the build's own manifests: the shared runtime plus every entry
  chunk the route's HTML asks for, gzipped. Lazy chunks are not counted.
- **Attribution.** `scripts/dev/perf-attrib.mjs` shows which packages and folders those bytes
  come from. Build with `ARENA_SOURCEMAPS=1` first.
- **Noise.** Single simulated runs of the same build swing by up to ~2 s of LCP (the runs are
  listed below), so every number here is a median.

## Results (median of 5)

| Screen | Score | LCP (s) | CLS | TBT (ms) | Tap latency (ms) | First-load JS (KB gz) |
|---|---|---|---|---|---|---|
| Feed | 83 → **92** | 4.58 → **2.71** | 0.038 → 0.038 | 84 → 124 | 160 → 168 | 363 → **256** |
| Discover | 95 → **97** | 2.66 → **2.48** | 0 → 0 | 129 → 91 | 112 → 112 | 373 → **271** |
| Activity details | 96 → **98** | 2.64 → **2.18** | 0 → 0 | 115 → 79 | — | 424 → **301** |
| Work | 98 → **99** | 2.03 → **2.01** | 0.003 → 0.003 | 132 → 97 | 64 → 56 | 364 → **262** |
| You | 100 → **100** | 1.37 → **1.45** | 0 → 0 | 85 → 64 | 72 → 80 | 350 → **260** |
| Discover map | 81 → **93** | 2.12 → **2.15** | **0.198 → 0** | 251 → 254 | — | 373 → **271** |
| Business pipeline | 94 → **94** | 2.93 → **2.89** | 0 → 0 | 93 → 65 | — | 338 → **251** |

Individual runs, as [score, LCP ms]:
- **Feed** after: [85, 4272] [97, 2302] [93, 2409] [76, 2707] [92, 3337]. Before: every run 4.4–5.1 s.
- **Pipeline** after: [94, 3059] [95, 2888] [99, 1896] [94, 3040] [86, 1845].

## Against the targets

| Target | Status |
|---|---|
| Performance score ≥ 85 | **Met on every screen** (92–100). |
| CLS < 0.1 | **Met on every screen.** The map was 0.198 and is now 0. |
| INP < 200 ms | **Met.** Taps take 56–168 ms with 4× CPU slowdown, and total blocking time is ≤ 124 ms except the map (254 ms, MapLibre's own start-up). |
| LCP < 2.5 s | **Met on Discover, Activity details, Work, You and Map. Not quite on Feed (2.71 s) or the pipeline (2.89 s).** On both, 2 of 5 runs are already under 2.5 s. What remains is network round-trips; see "Not met yet". |
| First-load JS ≤ 200 KB per route | **Not met: 186–301 KB** (all routes below). Explained under "Why not 200 KB". |
| MapLibre dynamic only; chart libraries | **Met.** MapLibre loads only in Discover's map mode, with a sized placeholder. There are no chart libraries; GSAP and three.js were already behind dynamic boundaries. |
| Fixture photos WebP ≤ 150 KB, right `sizes`/priority, excluded from production | **Met.** Details under "What changed". The admin screens' inline demo data is the one exception (Cursor's area). |
| Fonts subset, self-hosted, no layout shift | **Met.** Details under "What changed". |

## What changed

1. **Sentry out of every page's first load.** `instrumentation-client.ts` imported the whole SDK
   (~56 KB gz) on every page. It now loads only when a DSN is set, after idle, without Replay or
   Feedback. The second, unscrubbed init in `SentryClient` was removed, so PII scrubbing now
   covers every client event.
2. **Preview world out of production builds.**
   - In `api` data mode, `next.config.ts` swaps the preview world for typed empty stand-ins
     (`src/lib/preview-off/*`). That covers the world, mock posts, rooms, projects, activity,
     people, follows, Jenny's fixtures and the preview skills.
   - The `/dev` tools (tracker, compare pages, specimens) use `*.dev.tsx` page files, which only
     preview builds pick up.
   - The Dockerfile now passes `NEXT_PUBLIC_ARENA_DATA` and drops `public/fixtures` in api mode.
   - The map's real fallback image moved to `public/map/`: it is OSM geography, not preview data.
3. **Preview-only Jenny UI behind `next/dynamic`.** This covers Jenny noticed, Jenny's Work
   sections and Discover intent. The "Jenny filled" markers no longer drag every intake schema
   into every form.
4. **Motion: core with the app, drag and layout at idle.** `domAnimation` loads with the app;
   `domMax` (layoutId slides) is fetched after `load`. Exit animations are part of the core, so
   the old "stuck exit" can't return. `BottomSheet`'s drag-to-dismiss is now plain pointer
   handling on a motion value, with the same 120 px or fast-flick threshold. Before, it pulled
   motion's drag engine into every page.
5. **LCP.**
   - **Feed:** the loading skeleton leaves instantly, so the hero mounts as soon as data arrives.
     The content still dissolves in over 300 ms.
   - **Early data requests:** Feed, post details and the pipeline start their API requests when
     their code arrives, not after hydration and the session check.
   - **Hero photos** are eager with `fetchpriority="high"`; every other photo is low priority.
   - **Cloudinary photos** get a `srcset` (480/720/960/1280, or 120/240 for thumbnails), so a
     phone downloads the width it needs.
   - The API and CDN origins are preconnected.
   - The pipeline fetches the job and its applicants in parallel.
   - Post details load only the view for that post's type (activity, need/offer or older post).
6. **CLS.** The map box keeps its size while MapLibre loads.
7. **Every route.**
   - The 404 is a light B+ server page (it ships with every route) instead of the old animated one.
   - Fonts are trimmed to the weights in use: Inter 400–700 (48 → 36 KB), Fraunces 400–600
     (67 → 58 KB). Only the two B+ fonts are preloaded, and Fraunces has a metric-matched
     fallback.
   - The Welcome/You photo is now WebP (261 KB JPG → 144 KB).

One fix was tried and reverted:
- Preloading the You cover image (`priority`) made its LCP worse (1.4 → 2.3 s). On a
  client-rendered screen the preload competes with the JS the screen needs to paint.

## Why not 200 KB

Every route shares a 131 KB runtime (212 KB before). Attribution of `/home`'s 256 KB:

| Part | KB gz | |
|---|---|---|
| Next 16 app-router runtime (React DOM alone is 61) | ~150 | Fixed by the framework. |
| motion (`m`, AnimatePresence, core features) | ~50 | Its projection code is pulled in by `m` itself, so splitting features can't remove it. Mission §4 makes motion part of the design. |
| tailwind-merge (`cn`) | 8 | Class overrides depend on it. |
| Arena code (api, data, B+ kit, covers, screen) | ~45 | |

Framework plus motion is ~200 KB before any Arena code, so 200 KB per route can't be reached
without dropping motion from first paint. **Proposal for the architect:** budget Arena's own
first-load code instead, e.g. ≤ 130 KB beyond the shared runtime, and keep a hard route ceiling
of 300 KB. Today every route is within 170 KB of the runtime; the largest is Activity details at
301 KB.

## Not met yet — recommendations

1. **Serve the API same-origin** with a Next rewrite of `/api/v1/*` to arena-api, or a
   `api.arena.vikisol.in` → same-site setup with preflight caching.
   - Every data request from the app to `api-arena.vikisol.in` is cross-origin with an
     `Authorization` header, so it first needs a CORS preflight. That costs a full round-trip on
     4G before the Feed's hero photo or the pipeline's heading can even be requested.
   - On the measured screens this is the remaining gap to 2.5 s.
   - It is an infrastructure decision (traffic would pass through the web server), so it isn't
     made here. At minimum, arena-api should send `Access-Control-Max-Age` (Spring's default is
     30 min), so returning visitors skip the preflight.
2. **Admin demo data.** `src/lib/api/platformAdmin.ts` still carries inline demo tenants and
   users ("Lakeshore Tech") in its mock branch, so they reach production bundles. Admin (P10)
   is Cursor's, so this is left to that branch. Moving that data into a `src/lib/mock/*`
   module would put it behind the same production alias.
3. **Link prefetch.** Next prefetches every link in view. On the pipeline that includes each
   candidate row, repeatedly. Turning prefetch off for dense lists would free bandwidth on first
   load.

## First-load JS, every route (KB gzipped; before → after)

<!-- node scripts/dev/route-js.mjs -->
| Route | Before | After |
|---|---|---|
| `/feed/[id]` | 424 | 301 |
| `/activities/new` | 379 | 286 |
| `/identity/career/jenny` | 377 | 284 |
| `/interviews/[applicationId]` | 372 | 282 |
| `/identity/edit` | 385 | 280 |
| `/needs/new` | 372 | 279 |
| `/offers/new` | 372 | 279 |
| `/projects/new` | 372 | 279 |
| `/agent` | 370 | 277 |
| `/discover` | 373 | 271 |
| `/map` | 373 | 271 |
| `/identity/career` | 370 | 270 |
| `/marketplace/[id]/manage` | 372 | 268 |
| `/admin/flags` | 355 | 267 |
| `/admin/tenants` | 354 | 266 |
| `/identity/career/automation` | 355 | 264 |
| `/identity/career/shortlist` | 356 | 264 |
| `/rooms/[id]` | 354 | 264 |
| `/work` | 364 | 262 |
| `/identity` | 350 | 260 |
| `/agent/match/[id]` | 345 | 259 |
| `/discuss` | 365 | 259 |
| `/marketplace/[id]` | 364 | 259 |
| `/messages/[id]` | 343 | 259 |
| `/people/[id]` | 364 | 259 |
| `/search` | 345 | 259 |
| `/applications` | 362 | 258 |
| `/discuss/c/[slug]` | 363 | 258 |
| `/marketplace/bids` | 362 | 257 |
| `/marketplace` | 363 | 257 |
| `/work/saved` | 362 | 257 |
| `/companies/[id]` | 361 | 256 |
| `/companies` | 360 | 256 |
| `/discuss/communities` | 360 | 256 |
| `/home` | 363 | 256 |
| `/agent/draft` | 347 | 254 |
| `/enterprise/postings/new` | 355 | 254 |
| `/enterprise/interviews/[applicationId]` | 338 | 252 |
| `/applications/[id]` | 338 | 251 |
| `/enterprise/postings/[id]` | 338 | 251 |
| `/applications/new` | 341 | 250 |
| `/jobs` | 340 | 250 |
| `/auth` | 334 | 249 |
| `/` | 334 | 249 |
| `/enterprise/candidates` | 334 | 248 |
| `/settings` | 334 | 248 |
| `/enterprise/onboarding` | 348 | 247 |
| `/enterprise/admin/team` | 339 | 246 |
| `/enterprise/postings/[id]/candidates/[applicationId]` | 333 | 246 |
| `/enterprise/interviews` | 332 | 245 |
| `/enterprise/admin/audit` | 335 | 243 |
| `/enterprise/interviews/mine` | 336 | 243 |
| `/rooms` | 333 | 243 |
| `/enterprise/admin` | 335 | 242 |
| `/enterprise/interviews/mine/[interviewId]` | 335 | 242 |
| `/enterprise/posts` | 328 | 242 |
| `/enterprise/admin/billing` | 334 | 241 |
| `/enterprise/admin/consent` | 335 | 241 |
| `/enterprise/talent/[id]` | 327 | 241 |
| `/jobs/[id]` | 322 | 241 |
| `/enterprise/admin/company` | 333 | 240 |
| `/enterprise/dashboard` | 328 | 240 |
| `/enterprise/postings` | 327 | 239 |
| `/onboarding` | 326 | 239 |
| `/admin/moderation` | 327 | 238 |
| `/admin/users` | 326 | 236 |
| `/auth/forgot` | 321 | 234 |
| `/auth/reset/[token]` | 321 | 234 |
| `/enterprise/messages` | 321 | 234 |
| `/enterprise/talent` | 321 | 234 |
| `/reset-password` | 321 | 234 |
| `/admin/analytics` | 326 | 233 |
| `/admin` | 326 | 233 |
| `/notifications` | 313 | 226 |
| `/auth/invite/[token]` | 318 | 217 |
| `/invite/[token]` | 318 | 217 |
| `/pricing` | 309 | 207 |
| `/aup` | 299 | 201 |
| `/privacy` | 299 | 201 |
| `/terms` | 299 | 201 |
| `/access-denied` | 293 | 187 |
| `/enterprise` | 294 | 187 |
| `/messages` | 293 | 187 |
