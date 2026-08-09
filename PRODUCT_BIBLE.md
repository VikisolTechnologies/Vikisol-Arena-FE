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

**As of this entry, v3 code has not started yet** — this session so far has: committed
the spec docs, logged the key infra/architecture decisions (DECISIONS.md), logged the
real open blockers (BLOCKED.md — object storage, map tile provider, and a broken GitHub
push credential that's queuing commits locally), written the route migration table
(ROUTES.md), and is about to begin PART 15 Step 1 (auth/session rewrite). This file will
be updated as each step lands, with real per-step status — not marked done until it is.

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
