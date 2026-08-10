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
- Not yet done: Input/Chip/Nav/Sheet/Toast/Skeleton/EmptyState's exact radius/shadow
  polish per §4/§6 (functionally correct via the token cascade already, pixel-perfect
  tuning is follow-up), re-materialing the 3D orb for the light theme (§9).

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
