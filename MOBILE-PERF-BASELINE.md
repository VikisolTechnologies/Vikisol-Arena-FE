# MOBILE-PERF-BASELINE.md — mobile load investigation on arena.vikisol.in

## Methodology — read this before the numbers

This environment has **no browser automation tool** (no Playwright/Puppeteer/Chrome DevTools
Protocol/Lighthouse access) — every prior "verify in a real browser" ask this session has hit
the same wall and been disclosed rather than faked. That means the literal ask — "measure at
390px with 4x CPU throttle and Slow 4G, break down DNS/TLS/JS/hydration/auth/redirect/fetch/
render from a DevTools waterfall" — **cannot be done as a single instrumented browser trace**
here. Rather than skip measurement or invent numbers, this baseline reconstructs the same
timeline from three sources that are each individually real and accurate, cross-checked against
each other:

1. **Real network timing** — `curl -w` against the actual production domains
   (`arena.vikisol.in`, `api-arena.vikisol.in`), reporting real DNS lookup / TCP connect / TLS
   handshake / TTFB / total, not simulated. This is accurate for what it measures; it does not
   include CPU-throttled JS parse/execute/hydration time, which no non-browser tool can produce.
2. **Real bundle sizes** — every JS/CSS chunk `/feed`'s actual production HTML references was
   downloaded and measured directly (not estimated from source, not from a local dev build).
   Chunk contents were grepped for library signatures (Three.js/R3F, GSAP) to attribute size to
   cause with certainty, not guesswork.
3. **Actual code path, read line by line** — `auth-guard.ts`, `session.ts`, `httpClient.ts`,
   `/feed/page.tsx`, `CandidateAppShell.tsx`, `PersistentOrb.tsx`, `OrbScene.tsx` — to establish
   the *sequence and dependency structure* of what runs after the JS arrives, which a bundle
   size alone can't tell you.

Where a number is a real instrumented measurement, it's labeled **[measured]**. Where it's
reasoned from code + measured bundle sizes (e.g. "this must block that because X imports Y"),
it's labeled **[code-derived]**. Nothing below is a guess presented as a measurement.

All measurements below hit the live production deployment (`arena.vikisol.in` / Vercel,
`api-arena.vikisol.in` / Railway) on 2026-08-10, unauthenticated unless noted.

---

## 1. Network path — DNS / TCP / TLS / TTFB **[measured]**

Cold request to `https://arena.vikisol.in/feed`, no prior connection reuse:

| Phase | Time |
|---|---|
| DNS lookup | 0.072s |
| TCP connect | 0.139s (+0.067s) |
| TLS handshake | 0.212s (+0.073s) |
| TTFB (first byte) | 0.488s (+0.276s) |
| Total (HTML fully received) | 0.550s |
| HTML size | 26.7 KB |

This ~0.55s is close to a floor for this infrastructure (Vercel edge for the frontend) and isn't
the main lever here — it's dwarfed by what happens next. On Slow 4G (higher RTT, lower
bandwidth than whatever this measurement's origin connection has), expect this phase alone to
roughly double to triple, but it's still the smaller half of the total budget.

## 2. The HTML response is a client-side-rendering bailout, identical regardless of auth state **[measured]**

The literal string `BAILOUT_TO_CLIENT_SIDE_RENDERING` appears in `/feed`'s server-rendered HTML.
Confirmed directly: **the HTML returned is byte-for-byte identical** whether the request carries
no cookie or an arbitrary fake one — `diff` on both responses shows zero difference. The server
has no way to know or care whether the requester is logged in; every candidate route renders an
empty shell and defers 100% of auth resolution and data fetching to client JS. This is not a
subtle inefficiency - it's the literal architecture, confirmed both by the HTML bailout marker
and by direct A/B response comparison.

## 3. Initial JS payload for `/feed`: **~1.06 MB across 19 separate chunks** **[measured]**

Every `<script>` src referenced in `/feed`'s real production HTML was downloaded and summed:

```
19 chunks, 1,084,508 bytes total (~1,059 KB)
Largest individual chunks: 203KB, 197KB, 138KB, 113KB, 55KB, 54KB, 51KB, 45KB, ...
```

**Critical finding: this is almost entirely the app-wide shared bundle, not `/feed`-specific
code.** The same measurement against `/auth` (a logged-out page with no feed, no post cards, no
composer) returns **~1,045 KB across 18 chunks** — only 2 chunks differ between the two routes.
**~97% of `/feed`'s initial JS is identical to what a completely unauthenticated visitor
downloads just to see the sign-in form.** This reframes the whole investigation: the problem
isn't "`/feed` is heavy," it's "the shared floor every single route pays is heavy," which is a
more valuable thing to know because fixing it helps every page, not just one.

### What's actually in the shared floor **[measured, via chunk content grep]**

- **GSAP + ScrollTrigger + Draggable + InertiaPlugin: ~192 KB, present in the initial script
  list of every route checked, including `/feed` and `/auth`.** Traced to source: `src/lib/gsap.ts`'s
  `useGsap()` hook registers all three plugins unconditionally on first call, and it's called
  from `AuraBackground` (mounted unconditionally in `CandidateAppShell` **and** rendered from
  the root layout's own landing-page tree) purely to run two `gsap.to()` cursor-parallax tweens
  on two decorative blobs — it needs none of ScrollTrigger/Draggable/InertiaPlugin for that.
  `RouteTransition`/`PageTransition` are also mounted at the root layout (`app/layout.tsx`),
  so GSAP loads on literally every page in the app, marketing pages included, not just the
  authenticated shell.
- **Three.js / React-Three-Fiber: confirmed NOT in the initial script list** for either route
  checked - zero chunk in `/feed`'s 19-chunk script graph contains any Three.js/R3F/WebGL
  signature. Code-splitting via `next/dynamic(..., { ssr: false })` is working correctly here.
  *However* (see §4) - this doesn't mean zero cost, just deferred cost.
- Fonts: correctly self-hosted via `next/font`, preloaded, not render-blocking. No issue found.
- CSS: 2 `<link rel="stylesheet">` tags, genuinely render-blocking (standard browser behavior),
  **13.9 KB + 108.4 KB = ~122 KB** combined. The 108 KB file is almost certainly the full
  Tailwind-purged utility set for the whole app (shared across routes the same way the JS is) -
  not obviously a bug, but a real render-blocking cost worth knowing about.

## 4. The 3D orb: not in the initial bundle, but fetched immediately after, unconditionally, on every page **[measured + code-derived]**

`PersistentOrb` renders unconditionally inside `CandidateAppShell` (`CandidateAppShell.tsx:173`,
no gate) - present on `/feed`, `/map`, `/rooms`, `/identity`, `/settings`, `/companies`,
`/people/[id]`, `/work`, every candidate route except `/agent` itself. It `next/dynamic`-imports
`OrbScene`, which pulls in the Three.js/R3F/drei vendor bundle: **876 KB** (local build, this
specific chunk contains `IcosahedronGeometry`/`MeshDistortMaterial`/R3F signatures - confirmed
by grep, not inferred). Because the import fires the moment the shell mounts (immediately once
`profile` resolves and the authenticated view renders - no delay, no idle-callback, no
intersection check), this ~876 KB (compressed over the wire, meaningfully less, but still large)
download **lands in the exact window where the user is also waiting for feed content and its
own data fetch** - not blocking first paint, but directly competing for the constrained pipe
during the seconds that matter most on a throttled connection.

## 5. A live WebGL render loop runs behind `/feed` for as long as the tab is visible **[code-derived, high confidence]**

`OrbScene.tsx`: `frameloop={visible ? "always" : "never"}`, where `visible` comes from
`usePageVisible()` (pauses only on tab backgrounding, via the Page Visibility API). Since
`PersistentOrb` is permanently mounted on `/feed`, this means: **the moment the orb chunk
finishes loading, a `requestAnimationFrame`-driven WebGL render loop starts and runs
continuously for the entire time the user has the feed tab open and focused** - not just during
initial load. `quality={isMobile ? "lite" : "full"}` reduces geometry subdivision on mobile (a
real, working quality tier per ARENA-PERFORMANCE.md's own rule) but does not reduce *how often*
the loop runs, only how expensive each frame is. This is a genuine, ongoing main-thread/GPU cost
that coexists with feed scrolling/interaction, not just a load-time cost.

## 6. The auth + data fetch sequence, traced exactly **[code-derived from actual source + measured API timing]**

`auth-guard.ts`'s `requireOnboarded()` → `requireSession()` → `getSession()`/`isOnboarded()` are
**synchronous `localStorage` reads, zero network cost** - the "auth check" itself is not slow.
The real sequence on `/feed` (`src/app/feed/page.tsx`):

```
1. Browser downloads + parses + executes ~1.06 MB of JS (§3)         [the dominant cost]
2. React hydrates
3. useEffect fires: requireOnboarded(router) - sync, ~0ms
   - if no session: router.replace("/auth") (client-side nav, no server round trip needed,
     but still requires step 1 to have already happened first - see §7 below for why this
     matters for logged-out visitors specifically)
4. If session exists: getMyProfile() and load()/getFeed() fire WITHOUT awaiting each other
   - these two really do run in parallel today, not chained - confirmed by reading the code
5. Render is gated on `if (!profile) return <OrbLoader />` - i.e. gated on profile specifically,
   even if feed data already resolved first
```

Real API timing for step 4's two calls, measured directly against production
`api-arena.vikisol.in` (separate origin from the frontend - its own DNS/TLS, not warmed by any
connection the frontend already opened):

| Call | time_total (measured, 3 samples) |
|---|---|
| `POST /auth/signin` | 0.51s |
| `GET /profile/me` | 0.46s – 1.41s (real variance observed across samples, likely Railway cold-path variance) |
| `GET /posts/feed` | 0.37s – 0.61s |

So the honest total for an already-logged-in mobile visitor is roughly: **[JS download+parse+
hydrate, CPU-throttle-multiplied, unmeasurable exactly without a browser] + [~0.4-1.4s profile
fetch, run in parallel with] + [~0.4-0.6s feed fetch] + [render]** - and steps 3-5 cannot even
*begin* until step 1 has fully finished, because the entire auth/data-fetch sequence lives
inside a `useEffect`, which only runs after hydration.

## 7. Logged-out visitors pay the full JS cost just to be told to go to `/auth`

Because the redirect-if-not-authenticated check is itself inside the same client-only
`useEffect`, a logged-out visitor who lands on `/feed` (a bookmarked link, a shared URL, a stale
tab) pays the **entire** ~1.06 MB JS download + hydration cost before the app can even determine
it should redirect them - there is no server-side short-circuit today. This is the clearest,
most concrete instance of the "client redirect hop" cost named in the request.

## 8. Images: nothing to fix yet, stated honestly

Checked `PostCard`, `/feed/page.tsx`, `/feed/[id]/page.tsx`, and everything `CandidateAppShell`
mounts for `<img>` tags or `next/image` usage reachable from the feed. **None exist.**
`Post.mediaUrls` is a real data field but nothing in the current UI renders it - avatars are
emoji characters, not image files. There is no lazy-loading/sizing bug to fix here because
there's no image rendering at all yet. Noted rather than inventing a fix for a problem that
doesn't currently exist.

## 9. Optimistic UI gaps found

`ReactionButton` is already optimistic (updates local state before the network call resolves).
Checked the three other one-click toggle actions on feed/social surfaces - **none of them are**:
`FollowButton`, `CompanyFollowButton`, and `BlockButton` all `await` the network call before
updating any visible state, meaning every follow/unfollow/block/unblock click sits frozen for a
full round trip (comparable to the `/profile/me`/`/posts/feed` timings above) before the button
visually changes.

---

## Root-cause summary, ranked by leverage

1. **GSAP (~192 KB) loads on every single route in the app**, including ones that never use
   ScrollTrigger/Draggable/InertiaPlugin, because one shared hook registers all three
   unconditionally and two always-mounted components (`AuraBackground`, root-layout page
   transitions) pull it in. Highest-leverage fix: it's pure waste on `/feed` and most other
   authenticated routes, fixing it helps every page, and it's low-risk (no behavior change if
   done as a lazy-load, not a removal).
2. **The 876 KB 3D orb chunk fetches immediately and unconditionally** on every authenticated
   page, competing with the feed's own data fetch for bandwidth during the critical window.
   Deferring *when* it fetches (not removing it - see the standing "never delete 3D" rule)
   is a real, bounded win.
3. **The entire auth-check-then-fetch sequence is client-JS-gated with no server-side
   short-circuit**, confirmed architecturally true for every candidate route, not just `/feed`.
   This is the deepest issue and the one the request asks me to reconsider fixing via SSR + an
   HttpOnly cookie - assessed in the next section.
4. Render-blocking CSS (~122 KB) and the profile-gates-render coupling are real but smaller,
   already-close-to-necessary costs.
5. Optimistic UI gaps on Follow/Block toggles - a UX responsiveness fix, not a load-time fix,
   but named in the same request and cheap to close.

---

## The SSR + HttpOnly-cookie rewrite — decision: not doing it this pass, here's the real cost/benefit

Quantified the actual scope before deciding, rather than guessing at "big" or "small":

- **32 pages** use the identical client-side `requireOnboarded`/`requireEnterpriseOnboarded`
  guard pattern - this is not a `/feed`-specific quirk, it's *the* app-wide auth model.
- **23 of the ~30 `lib/api/*.ts` modules** branch on `isRealMode()` - the dual mock+real
  architecture (a deliberate, valued feature: the whole app runs with zero backend for demos)
  is foundational to how every one of those 32 pages fetches data, not incidental.
- Token storage (`httpClient.ts`), session state, and the onboarding-profile-merge logic are
  **all read/written directly against `localStorage`** at ~10+ call sites, with no abstraction
  layer a cookie-based model could slot behind transparently.
- The existing refresh-token cookie (`arena_refresh`) is scoped `Path=/api/v1/auth` on
  `api-arena.vikisol.in` specifically - **arena-web's own server cannot see it today at all**
  (different domain). Any server-side auth signal, even a minimal one, requires a *new*
  cross-subdomain cookie (`Domain=.vikisol.in`) issued by the backend - this isn't purely a
  frontend change no matter how the frontend side is scoped.

**Why I'm not shipping even a scoped slice of this** (e.g. "just add a non-sensitive
`Domain=.vikisol.in` marker cookie + `middleware.ts` to resolve the redirect server-side,
without touching the other 31 pages' data-fetching"): that piece is real and would help, but it
is still a change to **production authentication cookie issuance** - and this environment has no
browser automation available (§ Methodology above). I can verify the code is correct and that
`curl` sees the right `Set-Cookie`/redirect behavior, but I cannot verify real multi-navigation
browser cookie-jar behavior (SameSite enforcement across the actual redirect chain, expiry
timing across tab lifetimes, etc.) the way I could with real DevTools access. Shipping an
under-verified change to the mechanism that decides who's logged in, in an environment where I
can't fully test it the way the change deserves, is a worse trade than the one the measured data
actually supports (below).

**What the measured data itself says about expected ROI**: §3 found `/feed` and `/auth` download
**within 1.4% of the same amount of JS** (1,059 KB vs 1,045 KB) - ~97% shared. Server-rendering
`/feed`'s data wouldn't shrink that shared payload at all; the browser still has to fetch and
hydrate nearly the same ~1 MB either way to make the page interactive. SSR would mainly buy
faster *first paint* of feed content specifically and remove the redirect hop for logged-out
visitors - real wins, but smaller than they first sound once you know the JS floor is shared,
and §7's logged-out-redirect cost specifically is *also* addressed (for free, no cookie/auth
changes needed) by making the shared floor itself lighter, which is exactly what's fixed below.

**Recommendation if this gets revisited later**: do it as its own dedicated pass, not bundled
into a perf sprint - budget real browser-based auth-flow testing (this session's own repeated
finding is that this environment can't provide that), and scope it as an app-wide session-model
migration (cookie + middleware + probably a `getServerSession()` helper other Server Components
can use), not a `/feed`-only special case, given 32 pages share the exact same pattern today.

## What's actually being fixed this pass instead

Everything else the request asked for, at full strength, because none of it touches
authentication and all of it is independently verifiable without a browser:
1. Defer GSAP off the critical path (§ root cause #1 - the single highest-leverage, lowest-risk
   fix found, benefits all ~30+ routes, not just `/feed`).
2. Defer the 3D orb's chunk fetch so it stops competing with feed's own data fetch for
   bandwidth during the critical window - the orb itself, and its render loop, stay exactly as
   they are once mounted (no quality reduction beyond the tiering that already existed, no
   deletion, per the standing 3D rule).
3. Decouple the feed's loading gate from `profile` alone.
4. Optimistic UI on Follow/Block/CompanyFollow.

---

## Before / After — re-measured with the identical methodology, same routes, same curl flags

Deployed in two rounds (`b5101e9`, then `6ab59eb` + `fecc86a` after the first round's
re-measurement showed a null result — see "What didn't work" below). Both rounds are live on
`arena.vikisol.in` at the time of this writeup.

### Network path (DNS/TCP/TLS/TTFB) — unchanged, as expected

| Metric | Baseline | After | Δ |
|---|---|---|---|
| DNS lookup | 0.072s | 0.028s | noise — no DNS-affecting change made |
| TCP connect | 0.139s | 0.096s | noise |
| TLS handshake | 0.212s | 0.155s | noise |
| TTFB | 0.488s | 0.409s | noise — real-world variance, this pass made zero server/network-layer changes |
| Total (HTML received) | 0.550s | 0.471s | noise |
| HTML size | 26,749 bytes | 26,979 bytes | +230 bytes (new `armed`/idle-gate markup) |

No server-side change was made this pass (the SSR/cookie rewrite was explicitly deferred, see
above), so this table moving at all is just normal internet/server variance run-to-run, not a
result of anything shipped. `/feed`'s HTML is still byte-identical regardless of a fake auth
cookie — confirmed again on the current deploy — so the `BAILOUT_TO_CLIENT_SIDE_RENDERING`
finding from §2 stands unchanged, exactly as expected since nothing addressing it shipped.

### Initial JS payload for `/feed` — the honest result: **flat, not reduced**

| Metric | Baseline | After (final) | Δ |
|---|---|---|---|
| Total bytes | 1,084,508 | 1,085,145 | **+637 bytes (+0.06%) — statistically flat** |
| Chunk count | 19 | 21 | +2 |
| `/auth` for comparison | 1,045,xxx / 18 chunks | 1,074,474 / 20 chunks | still ~97% shared with `/feed` (19 of 21 chunks identical) |
| Three.js/R3F signatures present | 0 (already correctly deferred) | 0 (confirmed still deferred) | no regression, but no baseline win to claim here either — see "what genuinely changed" below |
| GSAP signatures present | ~192 KB, 1 chunk | ~155 KB, 2 chunks | **present in both, still eagerly `async`-loaded on every route** |

This is not the result the fix was meant to produce, and reporting it as a win would contradict
the entire measured-not-assumed standard this investigation has held to. Two separate, genuinely
different code-level approaches were tried and verified not to work:

1. **First attempt** (`b5101e9`): moved `gsap`'s import inside each of the three
   always-mounted components' (`RouteTransition`, `PageTransition`, `AuraBackground`) own
   `useEffect`, via a plain `import("gsap")`. Re-measured: **1,086,020 bytes / 21 chunks** —
   gsap chunks went from 1 large one to 5 smaller ones (228 KB combined, *more* than baseline),
   all still tagged `async=""` in the initial HTML. Root cause: these three components are
   unconditionally rendered in the root layout on every route, so Turbopack's build-time chunk
   graph still treats their reachable imports as near-certain-to-execute and lists them as eager
   scripts, regardless of the runtime `useEffect` timing. Execution was deferred; the network
   fetch was not.
2. **Second attempt** (`6ab59eb`): rebuilt this as a genuine `next/dynamic(..., { ssr: false })`
   boundary instead — the exact pattern already proven to work for `PersistentOrb`'s 876 KB
   Three.js chunk (confirmed absent from every `/feed` measurement in this document, including
   the very first baseline). Split each component's gsap logic into its own file
   (`RouteTransitionAnimator`, `PageTransitionAnimator`, `AuraBackgroundAnimator`), rendered only
   after a real trigger (a genuine navigation, or a first `mousemove`). Re-measured: **still
   1,085,008 bytes / 21 chunks, still 2 gsap chunks (~155 KB), still `async`.** Tried one more
   variant (`fecc86a`) matching `PersistentOrb`'s exact `.then((m) => m.Name)` named-export
   syntax on the theory that the default-export form was somehow handled differently by
   Turpoback's static analysis — re-measured again: **1,085,145 bytes, same 2 chunk filenames,
   unchanged.** That theory is disproven.

**Best-evidence root cause** (not fully verifiable without bundler-internals access this
environment doesn't have): the same 2 gsap chunks appear on **both** `/feed` and `/auth`, with
identical filenames, unaffected by either fix. `gsap` is still statically imported by **11 other
components** elsewhere in the app (`Hero`, `AgentOrb`, `OpenMarket`, `CountUp`, `Reveal`,
`SwipeCard`, `OnboardingShell`, `SkillNebula`, plus `applications/page.tsx`,
`marketplace/[id]/page.tsx`, `not-found.tsx`) — none of them reachable from `/feed`'s or
`/auth`'s own render tree, but all part of the same overall app bundle. The most consistent
explanation across every measurement here is that Turbopack's automatic shared/commons-chunk
optimization is grouping `gsap` into a small number of app-wide vendor chunks *because* it's
used widely across the app as a whole, and is then listing those chunks as a low-cost eager
preload on every route — a build-wide classification, not a per-route or per-component one. If
that's right, `next/dynamic` on 3 call sites was never going to change it, because the other 11
static imports keep tripping the same "used everywhere, worth preloading everywhere" heuristic
regardless of what those 3 components do. This is a real, verified finding — not a guess
dressed up as one — but I'm not certifying the exact bundler mechanism with 100% confidence,
since confirming it fully would require Turbopack-internal chunk-graph tooling this environment
doesn't have (same constraint as the rest of this document's Methodology section).

**What this means / recommendation**: the ~155 KB of GSAP is, as best as this investigation can
tell, a real floor under Turbopack's current automatic chunking for as long as *any* route in
the app uses gsap synchronously, not something fixable by touching only the components that
happen to run on `/feed`. Two honest paths forward, not attempted this pass:
- Convert the remaining 11 static `gsap` call sites to the same lazy pattern, removing every
  synchronous import of `gsap` anywhere in the app, and re-measure whether that changes the
  commons-chunk classification. Mechanical, bounded (11 files, same shape as the 3 already
  done), but *unverified* — it might not change anything either, and the only way to know is to
  do all 11 and redeploy, which is a real chunk of additional work for an uncertain payoff.
- Touch Turbopack/webpack chunk-splitting config directly to exclude `gsap` from automatic
  commons grouping. Not attempted — Turbopack's configuration surface for this is still
  evolving and I don't have a way to verify what's actually configurable without trial-and-error
  production deploys, which is a worse standard than the rest of this document has held to.

Given two verified null results already, I'm stopping here rather than guessing a third time.

### What genuinely changed and is verified working

Not everything in this pass was a null result — three things are real, code-verified wins:

1. **The 876 KB Three.js/orb chunk's fetch is now genuinely deferred to browser-idle time**,
   not just "already absent from the initial script list" (it was already absent at baseline —
   that part of §4's finding was never the problem). The problem §4 actually flagged was that
   the chunk fetched *immediately* the instant `CandidateAppShell` mounted, racing the page's own
   data fetch for bandwidth. `PersistentOrb` now gates that mount behind `useIdleReady()`
   (`requestIdleCallback`, 1200ms timeout fallback) — confirmed by code review of the shipped
   `PersistentOrb.tsx`; not independently re-measurable by a static `curl`, since it's a *timing*
   change (when the browser chooses to fetch) rather than a presence/absence change a HTML diff
   can show. No quality reduction, no scene deleted — full 3D, same tiering, just later.
2. **`/feed`'s render is decoupled from `profile` alone** — `CandidateAppShell` (with its
   existing `profile?.name ?? "Loading…"` null-tolerance) now renders immediately rather than
   blocking the entire shell on whichever of the two parallel fetches (`getMyProfile()` /
   `getFeed()`) happens to resolve slower. Verified by code review of the shipped
   `feed/page.tsx`.
3. **Optimistic UI, with rollback, on every one-click social toggle**: `FollowButton`,
   `BlockButton`, and `CompanyFollowButton` now flip visible state immediately and only revert
   on a genuine failure; `ReactionButton` (already optimistic) gained the rollback it was
   missing. Verified by code review of all four shipped files.

### What's still explicitly not fixed (carried forward honestly, not silently dropped)

- **Render-blocking CSS (~122 KB combined, 2 stylesheets)** — identified in §3, not attempted
  this pass. Lower leverage than GSAP/orb and riskier to touch safely without visual
  regression-testing I can't do here (no browser).
- **The continuous WebGL `frameloop: "always"` render loop** (§5) — only the *initial mount
  timing* changed (now idle-gated). Once mounted, the scene still renders every frame for as
  long as the tab is visible/foregrounded, unchanged from baseline. Not addressed this pass.
- **The SSR + HttpOnly-cookie rewrite** — explicitly assessed and declined this pass, cost/benefit
  above.
- **The GSAP shared-chunk floor** (~155 KB) — assessed above, not resolved this pass despite two
  genuine attempts.

### Tag

`v2.3-mobile-perf` reflects this state honestly: the 3D-chunk deferral, feed-loading-gate
decoupling, and optimistic-UI fixes are real and shipped; the GSAP bundle-size goal was
attempted twice, in good faith, with real code changes and real re-measurement each time, and
did not succeed — that result is reported as-is rather than glossed over.
