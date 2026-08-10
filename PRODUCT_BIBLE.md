# PRODUCT_BIBLE.md — Vikisol Arena, living status

Grounded only in what's actually shipped. Updated alongside every real feature or
architecture decision — never aspirational claims presented as fact. See DECISIONS.md for
the full rationale log and BLOCKED.md for open external dependencies.

## Vision (current, as of the v3 rewrite)

One sentence: **post what you need — a job, a project, a gig, or a badminton game at
4pm — and the right people near you show up.** Full spec: `ARENA-MASTER-ARCHITECTURE.md`
(routes/data/API/behaviour) + `ARENA-DESIGN-SYSTEM.md` (visual system — replaces that
file's PART 3). Both committed verbatim to both repo roots (2026-08-09), supersede every
earlier spec (`ARENA-V2-PRODUCT-ARCHITECTURE.md` and everything built under it).

The core loop every feature is weighed against: `NEED (a post) → RESPONSE (apply/bid/
join/comment) → CONVERSATION (a room) → OUTCOME (hired, paid, met) → IDENTITY (reputation
grows) → back to NEED.`

## Status: v3 rewrite in progress, starting from a real v2 base

This is not a greenfield build — `arena-web` (Next.js/TypeScript) and `arena-api` (Spring
Boot 3.3/Java 21/PostgreSQL/Flyway/Redis) are live, deployed (`arena.vikisol.in` /
`api-arena.vikisol.in`, Railway project `arena-staging`), and already have a working
posts/rooms/follows/comments/reactions/company-pages/moderation product built across
Phases A/B/C + a safety audit + a mobile-perf pass (all documented in this repo's own
git history and `SAFETY-STATUS.md`/`MOBILE-PERF-BASELINE.md`). The v3 spec keeps that
foundation (nothing thrown away — see PART 15's build order, which is additive/
transformative, not a wipe) and rebuilds the route map, data model, visual system, and
adds real-time/map/promotions/media on top of it.

**The founder set one change to the plan (2026-08-10):** deploy and ask for a look once
*both* Step 2 (design tokens + primitives) and Step 5 (the real Home feed) are built — one
combined checkpoint, not one after every step — then pause there before Steps 6–14
specifically. Continuing to build and commit locally in the meantime; nothing gets deployed
for review until that checkpoint is genuinely reached.

**ARENA-VISUAL-RICHNESS.md (2026-08-10) — raised the bar on that same checkpoint before
judging the look, now substantially met, still blocked on deploy:** the founder flagged the
Step 2+5 state as "dull/flat/not unique" (only `/home` + a couple primitives were actually on
the new ivory/champagne/gold system) and gave 8 concrete rules (R1 contrast blocks, R2
mandatory photography, R3 intentional shadow scale, R4 one hero moment/screen, R5 gold as
rare punctuation, R6 confident type contrast, R7 composed negative space, R8 signature
details) plus a minimum bar: migrate every shared primitive and at least Home/Discover/
Profile/Map/Inbox, with real photography and one contrast+hero moment each, before deploying
for review. Shipped this session (all committed locally, `eslint`+`tsc --noEmit` clean on
every commit — `next build`'s typecheck step OOMs on this dev machine's 5.85GB RAM
independent of any of these changes, so `tsc --noEmit` is the verification of record here):
- `EmptyState` (shared primitive, ~15 call sites) gained an illustrated icon-badge slot (R2),
  built on `--primary`/`--primary-soft` rather than the new product-only tokens so it still
  renders correctly on the ~40+ routes not yet migrated to `[data-theme="product"]`.
- Migrated onto `AppShell`/the product theme, beyond the named minimum: `/work` (new, R1/R4's
  named black "top match" hero card above the hub grid), `/marketplace` + its project-detail/
  manage/bids sub-routes, `/companies` + its detail route, `/applications` + its detail
  route, and `/people/[id]` (the public-profile view, given Identity's own cover-photo +
  black stats-block hero treatment for consistency). Reasoning: these are all one tap from
  the freshly-lit Work hub or are the same "Profile" screen type as Identity — leaving them
  on the old dark theme would have been an accidental, not deliberate, contrast break.
- R2 photography added to every card type touched: project/job/company thumbnails (seeded
  `picsum.photos`, same convention as the existing FeedItemCard/SwipeCard pattern) and real
  `PersonAvatar`s on every bidder/applicant/author row that still showed a bare emoji.
- R8's champagne-hairline (previously only on `AppShell`'s active nav) applied to section
  titles across every migrated screen (Home's right rail, Identity, Marketplace, Companies,
  Applications, the public profile).
- R3: the black stats block on Identity/public-profile — each screen's named hero element —
  gained its own elevated shadow so it reads as the focal tier, not flush with the resting
  ivory card around it.
- R5/R6/R7 spot-checked across the migrated screens against the existing design-system
  defaults (gold reserved for badges/rings/hairlines, `font-display` headings on
  near-black text, the existing padding/gap scale) — consistent, no changes needed.
- **Still open, explicitly deferred, not silently skipped:** notifications, settings, agent,
  interviews, jobs detail, and the legacy `/feed`/`/dashboard`/`/messages` routes remain on
  the old dark theme — the last three are slated for deletion/redirect (Steps 7's inbox
  merge, `/dashboard`'s existing retirement) so styling them now would be wasted work; the
  rest are lower-traffic than the Work-hub surfaces prioritized this pass and are queued for
  the next visual pass. Room-message sender photos (per-message, not per-room) were also
  deferred — noted in the original migration's commit too.
- **UPDATE — arena-web deployed 2026-08-10, checked live against the brief's own done-test:**
  the founder pushed by hand; verified via Railway deployment history (arena-web's latest
  deployment 22:08, superseding the prior one from 19:51) rather than trusting the claim
  alone. Screenshotted Home/Discover/Profile/Map/Inbox/Work at 1440px and 390px, logged in as
  the talent demo account — full report published as an artifact this session. Every R1–R8
  item confirmed rendering as designed: black contrast blocks, real photography, the
  elevated-shadow focal tier, gold used sparingly, champagne hairlines and rings all live.
  Two things surfaced by actually looking instead of just trusting the push:
  - **Home's feed is broken in production** — `GET /feed` 500s
    (`NoResourceFoundException: No static resource feed`) because **arena-api was never
    redeployed** — its live deployment is still from 00:29 that morning, before Step 3's
    unified-feed endpoint was even committed. arena-web's push landed and deployed; arena-api's
    did not. This is a backend deploy gap, not a visual-richness defect — needs its own
    `git push`/deploy from arena-api specifically.
  - One seeded placeholder photo failed to load mid-screenshot-run (Discover's card
    background) while others from the same host loaded fine in the same run — read as a
    transient hiccup in the automated test session, not a code defect; flagged for a manual
    glance, not fixed blind.
  - Continued past the checkpoint per the founder's explicit "continuous, no stopping":
    migrated `/notifications` (built for the first time — the nav bell has 404'd since Step 1
    since no page existed), `/settings`, `/agent`, `/interviews/[applicationId]` (+ the shared
    `InterviewRoom` component, carefully — it's also used by the still-unmigrated enterprise
    interview route, so only the dual-theme-safe token fixes went in there, not
    `PersonAvatar`), and `/jobs/[id]` onto `AppShell`/the product theme.

**Step 1 (auth/session rewrite) — mechanism shipped, real remaining scope still open:**
- `arena-api`: `arena_session` HttpOnly cookie (`SessionCookieHelper`), issued alongside
  the existing access-token JSON response at every sign-in/signup/2FA-verify/invite-accept/
  refresh call site; `JwtAuthenticationFilter` accepts it as a fallback when no
  `Authorization` header is present. Purely additive.
- `arena-web`: `serverSession.ts` (Edge-compatible JWT verification via `jose`) +
  `middleware.ts` resolves an already-signed-in visitor to `/auth` server-side, before any
  page JS loads. Fails closed until `JWT_SECRET`/`JWT_COOKIE_DOMAIN` are actually set on
  Railway — **re-verified 2026-08-10 that this still hasn't happened**, see BLOCKED.md.
- New `AppShell` (PART 4: side nav, mobile tab bar, GlobalSearch trigger, right-rail slot)
  + a real `/home` route on it (reuses existing feed data — not yet Step 5's full rebuild).
  `/feed` now redirects to `/home`. `CandidateAppShell` and every route still on it are
  untouched.
- Not yet done: migrating the other ~26 client-guarded routes (`auth-guard.ts`) to
  server-resolved equivalents, and a server-side onboarding-status signal (today only in
  localStorage) — ongoing background work, not gating the Step 2+5 checkpoint.

**Step 2 (design system) — tokens + scoping mechanism shipped, primitive polish ongoing:**
- Full `ARENA-DESIGN-SYSTEM.md` §2 token set added, scoped to `[data-theme="product"]`
  rather than replacing `:root` — see DECISIONS.md for why the polarity is deliberately
  inverted from the doc's own end-state (new surfaces opt into light, nothing currently
  dark breaks). `AppShell` carries the scope attribute; shared primitives (Button, Card,
  Avatar, Badge, ...) reskin automatically via the CSS cascade since they already reference
  semantic tokens, not hardcoded colors — Card's one hardcoded `bg-white/[0.03]` (which
  would've been invisible on ivory) is the exception, fixed to `bg-card`.
  Poppins loaded and applied product-wide. New `premium` Button variant added.
  Card gained real `--radius-card`/`--shadow-card-*` tokens (20px + soft shadow in the
  product theme, unchanged 24px/no-shadow everywhere else) — the highest-visibility single
  primitive, applied to `Card.tsx` and the new `FeedItemCard`.
- Not yet done, by deliberate scope: Button/Input/Sheet/Toast/Skeleton/EmptyState's own
  exact height/shadow/color specs (e.g. §6's 48/52px buttons) — functionally correct via
  the token cascade already (colors/fonts reskin), but their *geometry* (height, padding)
  is shared globally by ~50+ still-unmigrated pages, so changing it needs a real per-theme
  approach, not a blind global edit that would break every one of those pages at once — the
  same risk Card's own radius had, solved the same way, just not done yet for these.
  Re-materialing the 3D orb for the light theme (§9) also not started.

**Step 3 (data model + unified feed) — the feed-unification core is shipped, real scope remains:**
- `arena-api`: new `feed` package — `FeedAggregationService` queries `Post`/`JobPosting`/
  `Project` independently and merges them into one ranked `GET /feed?tab=for-you|nearby|
  following` stream (`FeedItemResponse`, a `type` discriminator + nullable per-variant
  fields) — see DECISIONS.md for why this is a response-level merge, not a data-model
  merge. `User.handle` (generated at signup/invite/seed, backfilled for existing rows),
  `Post.title`, `PostSave` (`/posts/{id}/save`, `/posts/saved`), `Project.kind`
  (PROJECT/FREELANCE). Verified past `mvn compile`: booted locally against the real dev
  Postgres/Redis specifically to catch any `ddl-auto: validate` mismatch before it could
  surface as a Railway boot failure — clean.
- Not yet done: `POST /posts/{id}/share` (repost/quote — a real composer-flow feature, not
  a quick add), media entity with renditions (that's Step 4's job), promotions/campaigns
  entities (Step 10's job).

**Step 5 (composer → Home feed) — Home feed is real and running on the unified API, composer
rebuild and post detail/discover are not started:**
- `arena-web`: `/home` now calls the real `GET /feed`, renders posts/jobs/projects through
  one new `FeedItemCard` (PART 7.5's "one component, type variants"), has the composer
  trigger row + quick type chips (Activity/Ask/Update open the composer preset to that
  type; Project deep-links to `/marketplace`'s own existing create flow), and
  For you/Nearby/Following tabs. Right rail: trending tags derived from the live feed,
  Nearby now (reuses the viewer's already-consented profile location, never a fresh
  geolocation prompt), Promoted as an honest empty state (no fake campaigns) until Step 10.
  `PostComposer` gained a `title` field and a `defaultIntent` preset.
- Not yet done: PART 7.6's actual 6-type composer redesign with a live PostCard preview
  (today's composer is still the pre-v3 Activity/Ask/Update dialog plus a title field, not
  a redesign), `/p/[id]` post detail (still routes to the existing `/feed/[id]`), Discover
  facets.

**Steps 4, 6–14 have not started.** This is a genuinely multi-session rewrite, executed
continuously per PART 15's order and the standing charter — this section is updated
honestly as each step actually lands, never marked done ahead of the real commits behind
it.

## Architecture (target, per the master spec)

- **Frontend:** Next.js App Router, TypeScript, Tailwind, server-resolved auth via an
  HttpOnly cookie (replacing the current client-side-only token model), MapLibre GL for
  `/map`, GSAP for motion, React Three Fiber for the 3D orb/identity graph (kept, tiered,
  re-materialled for the new light palette).
- **Backend:** Spring Boot 3.3/Java 21, PostgreSQL via Flyway migrations (`ddl-auto:
  validate`), Redis for feed caching + WebSocket pub/sub fan-out, WebSocket endpoints for
  realtime (notifications, conversations, post-level live updates).
- **Media:** direct-to-storage signed-URL upload (object storage provider TBD — see
  BLOCKED.md), self-hosted ffmpeg for video transcode, image renditions generated
  server-side.
- **Deploy:** Railway (`arena-staging` project: arena-api, arena-web, Postgres, Redis),
  custom domains `arena.vikisol.in` / `api-arena.vikisol.in`.

## Product principles carried forward

1. Every 3D scene stays — tiered by device/quality, never deleted, paused when off-screen
   or the tab is hidden.
2. Real data over fabricated impressiveness — no fake listings, fake match scores, fake
   companies. If seed content is needed to avoid an empty-feeling app, it's clearly
   idempotent demo data, never presented as real.
3. Safety is launch-blocking for the activity/stranger-meetup layer, not a follow-up
   (carried forward from the v2 safety audit — PART 10 restates and extends this).
4. Payments/billing/escrow stay mocked until a real gateway decision gets explicit
   sign-off — building the real UI/data model around that boundary, not the money
   movement itself.
5. Missing credentials get logged in BLOCKED.md with a concrete unblock action and the
   build continues around them (local-disk media storage instead of blocking on object
   storage, a keyless map instead of blocking on a tile-provider account) — never silently
   invented, never silently skipped.

## Open questions (tracked, not blocking)

- Object storage provider for durable media (BLOCKED.md).
- Paid map tile provider, once `/map` traffic justifies it over the keyless default
  (BLOCKED.md).
- Women-only activity gating needs a real gender-data product decision (BLOCKED.md,
  carried over from the safety audit).
- Activity ratings/reputation system — real scope, not started (BLOCKED.md).

## Roadmap

Executing `ARENA-MASTER-ARCHITECTURE.md` PART 15 in order, continuously, per the standing
autonomous-execution charter. Current step and real status tracked at the top of this
file's "Status" section and in the session's own todo list — this file is the durable
record, the todo list is the in-session working state.
