# STABILIZE-REPORT.md — ARENA-STABILIZE.md execution log (2026-08-12)

Living document, updated as each phase completes. Phases run strictly in order per
`ARENA-STABILIZE.md`; nothing in Phase N started before Phase N-1 was verified.

---

## Phase 0 — Make deploys trustworthy

### 0.1 — arena-api's broken auto-deploy: root cause + fix

**Root cause**: `arena-api`'s Railway service had **no GitHub source connected at all**
(`railway service list --json` showed `"source": null`, vs. `arena-web`'s
`"source": {"repo": "VikisolTechnologies/Vikisol-Arena-FE"}`). There was no webhook to be
broken — there was nothing to attach one to. Every prior "successful" deploy of arena-api
(including the ones logged in the earlier `SLEEP-REPORT.md` investigation) came from
`railway up`, a direct local-disk upload that bypasses git entirely, or from
`railway redeploy --from-source`, which — with no connected source — just re-ran the last
uploaded snapshot and reported `SUCCESS` regardless of what was on `origin/main`. That is
exactly the "green deploy, stale code" symptom that investigation documented, now explained.

**Fix**: `railway service source connect --repo VikisolTechnologies/Vikisol-Arena-BE --branch main --service arena-api`.
No dashboard clicks were needed — the CLI's `service source connect` subcommand does the
same thing GitHub-App-based reconnection would, so nothing went to `BLOCKED.md`. Connecting
the source triggered an immediate build on its own, confirming the webhook was live.

### 0.2 — Build stamps (staleness visible in 5 seconds)

- **arena-api**: new public `GET /version` (`/api/v1/version`) returning
  `{"commit": "<sha>", "builtAt": "<iso8601>"}`. Values come from `build-info.properties`,
  written into the image by the Dockerfile at build time from Railway's
  `RAILWAY_GIT_COMMIT_SHA` (auto-forwarded as a Docker build arg for git-connected services —
  confirmed working, see proof below). `VersionController` reads the file once at startup;
  `SecurityConfig` gets an explicit `GET /version` → `permitAll()` rule since the filter chain
  runs before method security and would otherwise 401 it.
- **arena-web**: new `BuildStamp` component — a small `text-ink-300` corner badge, mounted once
  in the root `layout.tsx` so it's present on every route regardless of which role shell wraps
  the page — plus a public `GET /version` route handler returning the same JSON shape. Values
  come from `NEXT_PUBLIC_BUILD_COMMIT`/`NEXT_PUBLIC_BUILD_TIME`, written into
  `.env.production.local` by the Dockerfile before `npm run build` (Next.js inlines
  `NEXT_PUBLIC_*` at build time, so this has to happen before the build step, not read at
  runtime). It's a plain component (no `"use client"`), so it renders server-side into the
  initial HTML — visible with zero JS execution, confirmed by `curl`ing the homepage directly.

### 0.3 — Stuck doc commits + the actual git-hang root cause

The two doc commits stuck since the last session (`b43da52`, `0c726c4`) were **not** a
Windows Credential Manager UI hang in the way it looked. Traced with
`GIT_CURL_VERBOSE=1 GIT_TRACE=1`: the system-level Git config
(`C:\Program Files\Git\etc\gitconfig`) sets `credential.helper = manager`, and the user's
global config *additionally* sets `credential.helper = store`. Git tries every configured
helper in order — `manager` first. `git-credential-manager get` then hangs indefinitely
waiting for an interactive browser/WAM prompt that this shell can never show or complete. The
working GitHub PAT was sitting the whole time in `~/.git-credentials`, reachable via `store`,
but `store` never even got tried because `manager` never returned.

**Fix**: reset each repo's local `credential.helper` to just `store`
(`git config --local credential.helper ""` then `git config --local --add credential.helper store` —
the empty value clears the inherited system/global list before re-adding `store` alone). Applied
to both `arena-web` and `arena-api`. Every push since has completed in well under a minute,
including from a cold shell. This was previously misdiagnosed as a "recurring, unresolved"
Windows GCM flake; it is actually a deterministic config conflict with a one-line fix.

### 0.4 — Proof: full commit → push → build → live-hash loop, both services

Pushed the Phase 0.2 build-stamp commits themselves as the live test:

| Service | Commit pushed | Live `/version` commit | Match |
|---|---|---|---|
| arena-api | `eea1e6c` | `eea1e6c5c417fa0c35b910a126f8649eafce8239` | ✅ |
| arena-web | `a583a5d` | `a583a5d7c46a1264608188077611ca6f5b8243f7` | ✅ |

Both builds triggered automatically from `git push`, both reached `SUCCESS`, both live commit
hashes exactly match what was pushed. `curl https://api-arena.vikisol.in/api/v1/version` and
`curl https://arena.vikisol.in/version` are now the standing way to verify "is this actually
deployed" — no more trusting a green Railway status alone.

**Phase 0 is green.** Proceeding to Phase 1.

---

## Phase 1 — Mobile home slowness: root cause with evidence

Full detail in `MOBILE-ROOT-CAUSE.md`. Summary:

- **Instrumented real-device Web Vitals** (`WebVitalsReporter`, live since `a614a9a`) — TTFB/FCP/
  LCP/CLS/INP reported to `/api/vitals`, logged to Railway stdout, filterable by path. Confirmed
  working live against real (self-generated) traffic; not yet checked against Syam's own phone.
- **Measured before touching anything**: lab (Playwright/CDP, iPhone 13, 390px, documented
  "Slow 4G" throttle — RTT 150ms/1.6Mbps/750Kbps + 4× CPU), cross-checked against the real-device
  reporter and a direct unthrottled `curl`.
- **The finding cut against the mission's own framing**: `/home` (the actual post-login feed
  route) was already meeting every Phase 1.5 target *before any fix* — FCP 492ms, feed visible
  in 1.48s. The real, reproducible, numbers-backed slowness is on the **public landing page's
  cold mobile load** (`/`, step G1 of the Golden Path): FCP 5888ms, LCP 7140ms, TBT ~1425ms,
  rated "poor" by Google's own thresholds. Reported this as the dominant contributor instead of
  force-fitting a fix onto `/home`.
- **Root cause**: `Starfield` (canvas particle field, below the fold) started its
  `resize()`+`requestAnimationFrame` draw loop — O(n²) work per frame — the instant it mounted,
  regardless of scroll position, competing with hydration for main-thread time before it was
  ever visible. TTFB (~2.8s of the ~5.9s FCP) is a separate, infra-attributed factor — confirmed
  via direct `curl` that real server response time is ~400ms, so the throttled-network delta is
  connection-establishment cost, not server slowness, and not code-fixable this pass.
- **Fixed**: new `useInViewport` hook gates `Starfield` to only animate once scrolled into view
  (pauses again if scrolled away) — same "defer until visible" convention already used elsewhere
  in this codebase (`AuraBackground`, `CountUp`).
- **Re-measured identically, live**: TBT -16% (1425ms→1191ms), FCP -7%, LCP -6%, 3 fewer long
  tasks. Real, verified — but honestly reported as **partial**, not a full fix: TTFB remains
  untouched and is now the clear majority of remaining time-to-FCP; the JS bundle itself (970KB
  uncompressed / 299KB compressed across 21 chunks) didn't shrink, only Starfield's *execution*
  moved later. A genuine follow-up bundle-splitting pass and/or an infra-level TTFB fix (CDN
  edge, connection reuse) remain open, logged rather than silently dropped.
- Also investigated and **correctly ruled out** an apparent duplicate `/profile/me` call on
  `/home` — turned out to be `signIn()`'s own existing `syncOnboardedFromProfile()` racing the
  test's navigation, not a real per-load bug. No code change made for it.

**Phase 1 is green** (root cause measured, dominant contributor fixed and re-verified, remaining
gap honestly attributed). Proceeding to Phase 2.

---

## Phase 2 — The Golden Path (G1–G9)

Walked end to end on a real 390px viewport against the live site, twice for stability (both
clean 23/23 passes) — Playwright driving two real accounts through the actual product surfaces
(taps, form fills, real navigation), not a synthetic API test. **Fixed six real, live-confirmed
dead ends along the way**, each found by the walk itself, not guessed in advance:

1. **Every `Dialog`/`Sheet` was untappable behind the cookie banner.** `dialog.tsx`/`sheet.tsx`
   used `z-50`, far below `CookieConsentBanner`'s `z-[900]`. Any modal opened before the banner
   was dismissed — first hit was `PostComposer`'s Publish button during signup — had its own
   controls physically covered. Bumped both to `z-[950]`. App-wide fix: every `Dialog`/`Sheet`
   call site, including `CommandDialog`.
2. **Onboarding's Continue button, same root cause, different element.** `OnboardingShell`'s
   footer isn't a Dialog — a fresh signup landed on `/onboarding` with the Continue button
   pinned under the still-showing cookie banner, no way to finish signing up. Applied the same
   space-reservation pattern every app shell's sidebar already uses
   (`use-cookie-consent-visible.ts`).
3. **No way to reach a room member's profile from a room.** `RoomsInbox`'s member list rendered
   plain, unclickable text — G7 ("open the other person's profile from the room, follow them")
   was structurally impossible. Member rows now navigate to `/people/[userId]`.
4. **Fresh signups can't join or create an Activity — DOB is required, never collected.**
   `PostService.requireAdult()` 400s with "Add your date of birth in Settings," but candidate
   onboarding never asks for it, and nothing in the UI got the user there. Added a "Go to
   Settings" link to both the post-detail join error and `PostComposer`'s create error whenever
   the backend message points at Settings. (Intentionally not fixed: whether DOB belongs in
   onboarding itself is a real product/schema question, out of scope for this pass.)
5. **Mobile sign-out was flat-out unreachable on `/home` and most of the app**, and unreachable
   a second, different way on `/feed`/`/messages`. Two distinct bugs, same symptom:
   - `AppShell` (used by `/home`, `/discover`, `/notifications`, `/rooms`, `/settings`, etc.):
     its mobile drawer already had a Log Out button, but — like finding #1/#2 — it never
     reserved space for the cookie banner, so the banner covered it.
   - `CandidateAppShell` (used by `/feed`, `/feed/[id]`, `/messages`): its mobile drawer had
     **no account block or Log Out button at all** — only the desktop sidebar did. Mirrored the
     desktop block into the drawer.
   - Fixing both then exposed a **third, subtler bug**: both drawers sat under the bottom tab
     bar (`z-[890]`) despite being *numbered* higher (first attempt: `z-[895]`) — because both
     drawers were nested inside a `relative z-10` ancestor, which creates its own stacking
     context. A nested element's z-index is compared against outside siblings using the
     *ancestor's* z-index (10), not its own — so `z-895` inside a `z-10` box still loses to a
     sibling's `z-890`. Fixed for real by moving both drawers out to be true siblings of their
     tab bars, not by renumbering again.
6. **Shared post links didn't work logged-out at all — 404/login-wall, not a graceful public
   view.** `/feed/[id]` used `CandidateAppShell` (hard-redirects any anonymous visitor to
   `/auth`) and `GET /posts/{id}` required auth server-side. This is the exact class of bug
   `ARENA-INVENTORY-FIXES.md` FIX 1 already fixed for profiles/companies/discover — posts were
   missed, and the Golden Path's own G9 step calls it out explicitly. Fixed both layers:
   backend (`PostController.getPost`/`getComments` now `permitAll()`, null-viewer-tolerant
   service layer was already in place; `SecurityConfig` lists `/posts/feed|mine|saved|nearby|
   trending` explicitly before the new `/posts/*` wildcard, same specific-before-wildcard
   ordering as the `/profile/me` vs `/profile/*` precedent) and frontend (swapped to `AppShell`;
   Join/Report/React/Comment now show a sign-in prompt instead of silently 401ing or leaving
   stuck optimistic UI state).

**Investigated and correctly ruled out** (would have been wasted fixes for things that weren't
actually broken): an apparent duplicate `/profile/me` call on `/home` (test-timing artifact, see
Phase 1); "0 applications after applying" (test used the wrong selector — cards are `div
onClick`, not `<a>`, see next paragraph); a `/rooms` member-click failure and a `/settings`
DOB-save failure that both turned out to be my own test script's stale state after a
`page.reload()`, not product bugs.

**Found, logged, not fixed — genuinely out of scope for this pass:**
- A `404 /follows/{id}` fires in the background after following someone from a room (id
  `a566d5f6-...`) — this is the same `CandidateProfile.id` vs `User.id` mismatch flagged as a
  loose end in the earlier `SLEEP-REPORT.md`. Doesn't block the action (follow itself succeeds);
  not re-investigated here.
- Application cards on `/applications` (and similar list cards elsewhere) are `div onClick`, not
  real `<a>` tags — not keyboard-operable, no native "open in new tab." This is the same
  "non-semantic list-card links" item `PAGE-INVENTORY.md` already scoped out as P2; left that
  way rather than re-opening a previously deliberate scope decision.

**Phase 2 is green** — G1 through G9 walked clean, twice, on live production, 390px, with
screenshots at every step. Proceeding to Phase 3.

---

## Phase 3 — Trim to coherence

Inventoried against `PAGE-INVENTORY.md`'s 65-route audit (updated 2026-08-11, all P0/P1 findings
already fixed as of that pass) and this session's own live checks. Honest finding: **there wasn't
a large hidden-broken surface left to trim.** Phases 0–2 already closed the real dead-ends this
mission cared about (public routes, wrong-role redirects, dead taps, the join/apply/message/
follow/notify loop). What Phase 3 actually found:

- **`/map` was the obvious HIDE candidate by this mission's own description ("unfinished map
  tiles view") — checked live and kept it.** First look (default 5km radius, this session's test
  coordinates) showed an empty radar with no markers, which looked exactly like the unfinished
  placeholder the mission predicted. Before hiding a real feature on a hunch, widened the radius
  to 25km (where a real nearby post existed per a direct API check) and re-tested: a real marker
  rendered correctly, filters work, the geolocation-consent gate works, zero console errors, no
  visual bugs, ivory system applied throughout. It's an abstract radar rather than literal map
  tiles (matches `ROUTES.md`'s own honest self-description), but it is a genuinely working
  feature, not a placeholder. Trusting the live evidence over the mission text's own prediction —
  hiding a working feature would be a real mistake, not a trim.
- **`/admin/promotions`** — confirmed 404 (`ROUTES.md` marks it ⬜, not built), but it is **not
  linked from `PlatformAdminShell`'s nav at all** — grepped to confirm. No dead tap exists today;
  nothing to hide because nothing visible points at it.
- **One real, live-found nav-coherence gap, fixed**: `/feed/[id]`'s "Back to Feed" button (moved
  onto `AppShell`'s Home/Discover/Map/Work/Inbox nav during Phase 2's public-post-detail fix)
  still targeted `/feed` — the older, `CandidateAppShell`-based list page. An existing
  `next.config.ts` redirect already sends `/feed` → `/home`, so this wasn't actually broken, just
  a wasted redirect hop with a label that no longer described its destination. Pointed directly
  at `/home`, relabeled "Back to Home."
- **Found and deliberately NOT touched**: two parallel, overlapping app shells currently coexist
  — `AppShell` (newer, PART 4 nav: Home · Discover · Map · Work · Inbox · Saved · Notifications;
  serves `/home`, `/discover`, `/notifications`, `/rooms`, `/settings`) and `CandidateAppShell`
  (older nav: Feed · Map · Rooms · Work · Identity · Messages · Settings; serves `/feed/[id]`
  before Phase 2, still serves `/messages`). This is real, and it is exactly the kind of
  incoherence Phase 3's brief describes — but it's a pre-existing, *acknowledged-in-code*
  transitional state (`AppShell`'s own top comment: "CandidateAppShell is untouched and still
  serves every route not yet migrated... this is additive, not a replacement"), tracked as
  ongoing migration work in `ROUTES.md`/`PART 15`, not a hidden bug this pass discovered. Fully
  unifying it means deciding which shell every remaining `CandidateAppShell` route (`/messages`
  primarily, now that `/feed/[id]` moved) should migrate to — a real structural call, not a
  "hide what's broken" trim, and explicitly the kind of spec/PART-15 work this mission says not
  to start. Flagging it clearly here rather than silently accepting it or quietly attempting it.

**No pages were hidden this pass** — the honest result of actually checking, not a skipped step.
Every visible nav item, on both shells, leads to a real, working page; nothing 404s from a
visible tap (confirmed across Phases 0–3, live, both viewports).

**Phase 3 is green.**

---

## Definition of done — checked against ARENA-STABILIZE.md's own bar

> "Syam can pick up his phone, cold-open arena.vikisol.in, and walk G1–G9 himself with zero dead
> taps, zero blank screens, no lag that makes him wait — on a build whose footer hash matches
> origin/main."

- **Build hash matches origin/main, checkable in 5 seconds**: `/version` on both services,
  footer stamp on every page — confirmed live throughout this pass (see Phase 0).
- **G1–G9, zero dead taps**: walked clean twice on live production at 390px (Phase 2) — six real
  dead-end/dead-tap bugs found and fixed along the way, not assumed away.
- **No lag that makes him wait**: root cause measured before any fix, dominant contributor
  (landing page cold-load JS/CPU work) fixed and re-verified with real before/after numbers,
  remaining gap (network/TTFB, infra-level) honestly attributed rather than hidden (Phase 1).
- **Not yet field-confirmed**: the real-device `WebVitalsReporter` is live and correctly
  reporting (confirmed via Railway logs), but no traffic from Syam's own phone has hit it yet —
  this report's confidence is "strong lab + live-account evidence," not "confirmed on his exact
  device." Recommend he open the site once; `railway logs --service arena-web | grep web-vitals`
  will show real numbers within seconds.

**Loose ends carried forward, not silently dropped:**
- Landing page's JS bundle (970KB uncompressed / 299KB compressed) didn't shrink this pass, only
  Starfield's execution moved later — a genuine bundle-splitting pass remains open (Phase 1).
- TTFB on cold mobile connections (~2.8s) is infra-attributed (connection-establishment latency
  under Slow 4G), not code-fixable this pass — a CDN edge or similar would be the real lever.
- The `CandidateProfile.id` vs `User.id` mismatch (causes a background 404 after following
  someone reached via a room) — pre-existing, documented in the earlier `SLEEP-REPORT.md`, not
  re-investigated here.
- Non-semantic `div onClick` list cards (`/applications` and similar) — pre-existing, already
  scoped out as P2 in `PAGE-INVENTORY.md`, left that way.
- The `AppShell`/`CandidateAppShell` dual-nav situation (Phase 3) — real, flagged, deliberately
  not attempted here; it's structural migration work, not a trim.
- The DOB-for-Activities requirement surfaces via an error message with a "Go to Settings" link
  now, rather than being silent — but whether DOB belongs in onboarding itself is a real product
  question, not decided here.

Feature work (Phase 4's three UI upgrades, and anything beyond) resumes only after this report is
read — per the mission's own closing instruction, five items at a time from real usage notes,
not another full rebuild.
