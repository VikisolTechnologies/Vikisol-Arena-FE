# DECISIONS.md — architecture calls made without stopping to ask

Per the mission's standing rule: decisions get logged here instead of interrupting the
user. Each entry says what was decided, why, and what it costs/defers.

## ARENA-V2-PRODUCT-ARCHITECTURE.md Phase B — architecture calls (2026-08-09)

**No PostGIS. Geohash + Haversine in application code instead.** Confirmed before starting:
zero spatial extension, zero `hibernate-spatial`/JTS dependency, plain `PostgreSQLDialect`
anywhere in `arena-api`. Standing up PostGIS on a hosted Railway Postgres (confirming the
extension is even available, a schema migration enabling it, a new geometry-type Maven
dependency) is real infra risk for what "coarse nearby discovery" actually needs. Instead:
a small self-contained `GeohashUtil` (encode/decode, ~40 lines, no new dependency) buckets
posts by geohash-prefix match for a cheap first-pass radius filter, refined by real Haversine
distance (also inline, no dependency) computed against the already-coarse/jittered stored
coordinates for accurate sort-by-distance within that bucket. This is a well-established
simplification for "good enough" proximity search and matches §5's own explicit instruction
to store "a coarse geohash/H3 cell," not precise geometry.

**The Map screen is a stylized relative-position visualization built on the existing React
Three Fiber stack, not a real street map.** No Mapbox/MapLibre/Google Maps API key is
configured anywhere in this environment, and none of those libraries are dependencies today.
Rather than blocking on obtaining a paid mapping key, or introducing a brand-new heavy mapping
library + tile-loading infra for a "coarse discovery" feature, pins are plotted on a tilted 3D
plane (R3F, already a dependency) using each post's offset from the viewer's own coarse
position (bearing + distance -> local x/z coordinates), styled with the same glass/glow
language as the "Talent Universe" starfield. This is a *direct* application of §9's own
framing — "the Talent Universe language applied to the real world" — not an improvised
substitute for a real map. A sortable/filterable list view sits alongside it so discovery is
fully usable by distance/time/type even without reading the visualization, matching how
Talent Universe already pairs a visual with real underlying search results. Real street-map
tiles (Mapbox/MapLibre + a real API key) are a clean drop-in upgrade later that only touches
this one component — nothing else in the data model or API depends on which rendering
approach the map uses.

**`ModerationItem` generalized additively, not restructured.** Its current shape (a single,
`nullable = false` FK straight to `JobPosting`) has an explicit comment noting the
single-moderatable-entity assumption. Rather than migrating to a generic
`contentType`/`contentId` pair (a real schema/data-risk change to a table that may already
hold live PENDING items from the existing job-posting auto-flag flow), added a nullable
`room_id` FK and a `contentType` enum (`JOB_POSTING` default for all existing/future
job-posting flags, `ROOM` for the new room-report flow) alongside the untouched existing
column. `ModerationService`'s existing `autoFlag`/`dismiss`/`listQueue` logic for job
postings is completely unchanged; `takedown()` branches on `contentType` for the one place
its behavior genuinely differs (closing a `JobPosting` vs. cancelling a `Post`/closing its
`Room`). Phase A's `RoomReport` table is kept as the immutable raw-evidence record (reporter,
room, reason, timestamp) and now *additionally* files a real `ModerationItem` so reports are
actually actionable in the admin queue, not just sitting in an unread table — the mission's
own explicit "wired into the platform-admin moderation queue" requirement.

**Phone verification is fully real, built on the existing Noop-provider pattern
(`EmailProvider`/`WhatsAppProvider` -> `Noop*Provider` -> real, resolved once at startup by
`IntegrationProviderConfig`).** A `PhoneOtpProvider` interface + `NoopPhoneOtpProvider`
(logs the code it would have sent, same style as the existing Noop providers) means the
entire OTP generate/hash/expire/verify flow is genuinely functional today with zero paid SMS
integration — a real Twilio-backed (or similar) provider is a pure drop-in later, exactly
like Resend/WhatsApp already work. **ID verification tier is NOT built this pass** — see
BLOCKED.md. Faking "ID verified" with no real document check would be a materially different,
more safety-critical gap to paper over than an OTP a Noop provider logs instead of SMS-ing;
the honest scope this pass is phone-tier verification fully working, ID-tier modeled in the
schema (the enum has the value, gating logic already checks `>=` a required level generically)
but not reachable through any real or manual-review flow yet.

**Age-gating is self-attested date-of-birth, not cryptographically verified.** No ID-
verification vendor exists (see above), so there is no way to *prove* an entered birthdate
this pass — the honest implementation is: capture a date of birth once, hard-block joining or
creating any `ACTIVITY` post (the stranger-meetup-relevant intent type; `ASK`/`UPDATE` don't
carry the same real-world-meetup risk) for anyone under 18 by that self-attested date, and
never let the flow be skipped. This is real, working, minor-blocking logic — not a checkbox
that does nothing — but it's not fraud-proof, and that limitation is stated plainly rather
than implied to be stronger than it is. Automated age/ID verification is the natural
extension once a KYC vendor is chosen (see BLOCKED.md).

**Location: only ever store a geohash-derived *approximation* of a person's own position,
never the raw device coordinate, even server-side.** When the browser reports a precise
GPS point (only ever requested under `PRECISE` consent, via an explicit browser permission
prompt, and only for account-level "what's near me" centering — never persisted raw), the
backend immediately geohash-encodes it and decodes that geohash back into an approximate
lat/lng for storage — the literal reported point is used for the one encode operation and
discarded, never written to a column. Every stored position (a user's own discovery center,
a post's location) is already-coarse by construction, then gets a second, independent random
jitter (up to ~150m) applied *again* at read/serve time for map-pin display specifically, so
even the coarse stored value isn't the exact thing rendered to other users. `CITY` consent
skips device geolocation entirely (manually typed home city, geocoded to that city's own
public center point — inherently coarse). `OFF` stores nothing location-related at all; the
Map screen and Feed's ranking both degrade gracefully to "no distance-based centering/sort,"
never a broken or blocked state, per §5's explicit "the app must remain usable at 'off'."

**Scope note, stated plainly rather than silently compressed:** Phase B is substantially
larger than Phase A (new geospatial capability, a new safety/verification subsystem, the
first scheduled-job infrastructure in this codebase, and a new 3D screen), and this session
is building it completely and correctly rather than rushing into Phase C to also "finish" a
mission the founder framed as continuous. Phase C (company pages, comments/reactions, trends,
profile revamp, embedding-based feed ranking) starts immediately after Phase B is verified
and tagged `v2.1-phase-b`, in the same continuous session, not deferred to a future prompt.

## ARENA-FINAL-CUTOVER.md — Step 3 domain conflict resolved (2026-08-06)

**Released `api-arena.vikisol.in` from the old `Vikisol-Arena-BE` service and bound it to the
new `arena-api` service**, with Syam's explicit, specific confirmation of the exact command
first (`railway domain delete api-arena.vikisol.in --service <old Vikisol-Arena-BE> --yes`) -
this is a Claude Code auto-mode-classifier-blocked action category (domain/infra deletion
commands need explicit confirmation even under a broad "do everything yourself" grant), so it
surfaced for approval rather than running silently despite the earlier blanket authorization.
Both domains now have Railway-issued CNAME targets: `arena` → `55amzai3.up.railway.app`,
`api-arena` → `vvh1z4s9.up.railway.app`. DNS changes themselves remain genuinely Syam-only -
not a permissions question, a capability one (no GoDaddy access exists in this environment at
all) - handed off in BLOCKED.md, with this session polling for propagation rather than waiting
on a re-prompt, per Syam's "let me know once done" instruction.

## ARENA-FINAL-CUTOVER.md — Step 1 complete, GitHub push done (2026-08-06)

**Both repos force-pushed successfully; three fine-grained PATs failed first, a classic PAT
worked immediately.** `arena-web` → `VikisolTechnologies/Vikisol-Arena-FE` (`master:main`,
forced update, all 4 tags), `arena-api` → `VikisolTechnologies/Vikisol-Arena-BE` (same, 3
tags). Before finding a working token: two separately-generated fine-grained PATs both
authenticated fine via the GitHub REST API (`GET /repos/{owner}/{repo}` reported
`push: true`) but both failed identical `git push` attempts with `remote: Write access to
repository not granted`; a third fine-grained PAT failed differently, with `remote:
Permission ... denied to VikisolTechnologies` - GitHub attributing the push attempt to the
*organization* itself as the actor rather than a member account, which reads as an
org-level fine-grained-PAT restriction (or a token minted at the org's own token-settings
page rather than a member's personal one) rather than anything wrong with repo-level
permissions. A classic PAT (`ghp_...`, `repo` scope) sidesteps that whole mechanism and
worked on the first attempt. Worth remembering if a token is needed again for this org:
reach for a classic PAT first, don't burn time on fine-grained ones here.

**Token handling followed the file's own instructions exactly**: every token was embedded
in the git remote URL only for the single push command that needed it, verified via
`git remote -v` to confirm it was stripped immediately after (success or failure, every
time), never written to a file, never echoed in full, never committed. The API-based
permission check (before ever attempting a push) used `Authorization: Bearer` headers, not
a logged URL, for the same reason.

**Force-pushed over `Vikisol-Arena-BE` despite its current deployed commit not obviously
matching the "dead pre-rewrite code" framing** - its live Railway deployment was running a
2026-08-01-dated commit ("log Ask Arena's real-agency actions and the autonomous-execution
charter") that doesn't match either "old pre-pivot Spring Boot/Vite app" or anything built
in this session. Flagged this explicitly before touching anything; Syam confirmed it was
fine to overwrite. Recorded here in case that commit's content is ever needed later - it no
longer exists on the default branch after the force-push (git reflog/reachable history on
the old tip is gone from the remote, per force-push's normal semantics).

## ARENA-GO-LIVE-ON-DOMAIN.md — domain cutover run (2026-08-06)

**Step 1 (GitHub push) confirmed still blocked** - no `gh` CLI, no token this session
either. Per the file's own explicit, non-negotiable ordering, this means Step 5 (retiring
the old deployment) cannot run this session regardless of how far Steps 2-4 get - proceeded
with Steps 2-3 anyway, exactly as instructed.

**Step 2 (production-domain config) - Railway env vars only, no code changes needed.**
`CORS_ORIGINS`/`FRONTEND_URL` on arena-api and `NEXT_PUBLIC_API_BASE_URL` on arena-web
updated to the `arena.vikisol.in`/`api-arena.vikisol.in` values. The cookie-domain item in
the file's checklist turned out to be a non-issue for this architecture: `RefreshCookieHelper`
never sets an explicit `Domain=` attribute (scoped to the issuing origin + `/api/v1/auth`
path only), and since arena-web/arena-api are two *separate* domains (not subdomains sharing
`.vikisol.in`), the existing `SameSite=None; Secure=true` config (already set for the
Railway staging env) is exactly what cross-origin `fetch(..., {credentials:'include'})`
needs - no `.vikisol.in`-wide cookie domain to configure. Confirmed no Google/OAuth code
exists anywhere in this rewrite (grepped both repos) - the old deployment's OAuth redirect-URI
checklist item is N/A here, nothing to list for Syam's Google Cloud console.

**Step 3 (Railway domain binding) - partially blocked, stopped rather than worked around.**
`railway domain arena.vikisol.in --service arena-web` succeeded cleanly (CNAME target:
`55amzai3.up.railway.app`) - Vercel's existing A-record doesn't conflict with Railway's own
domain registry, only with actual DNS resolution (Syam's part). `railway domain
api-arena.vikisol.in --service arena-api` failed outright: read-only inspection (`railway
domain list`) confirmed that hostname is already registered as a custom domain on the *old*
`Vikisol-Arena-BE` service in the pre-existing "Vikisol-Arena" project (ACTIVE, created
2026-07-05) - Railway enforces one active custom-domain binding per hostname account-wide, so
it can't be claimed for the new service until released from the old one. Releasing it would
functionally retire the old service's public reachability, which is exactly the kind of
old-deployment action the file frames as Syam's call (Step 5's "Syam-only... Claude cannot
reach these"), not something to route around via the same authenticated CLI just because it's
technically reachable - and Step 5's own gate (GitHub push first) isn't satisfied yet anyway.
Stopped and surfaced to Syam rather than releasing it unilaterally - see BLOCKED.md.

## ARENA-SHIP-IT.md — harden/deploy run scope calls (2026-08-05)

**AI-agent guardrails (checklist section 8) are N/A this pass, not skipped.** A full
codebase audit found zero live LLM/AI integration anywhere in arena-api — no OpenAI/
Anthropic SDK, no API key config, no scheduled job. "The agent" is entirely
`ScoringService`'s deterministic arithmetic (skill-overlap %, career-health formula) plus
templated notification copy (`NotificationService`, `DataSeeder`'s demo text like "your
agent scanned 24 postings"). Nothing auto-fires: `ConsentSettings.autoApply` is stored and
round-tripped but never read to trigger an application anywhere (grepped every call site).
So there is no prompt-injection surface, no hallucination risk, no autonomous action to
put a human-in-the-loop gate in front of — building one now would be gating nothing. The
real guardrail work is legal/UX honesty: none of the current UI/notification copy should
overclaim "AI" or "autonomous agent" beyond what's actually happening, since overclaiming
is itself a DPDP/consumer-protection risk once real users read it. Section 8 becomes a
fast-follow the day a real LLM integration is proposed, not a launch-blocker for what
exists today. Logged so this doesn't read as "skipped a launch-blocker."

**Payments/marketplace-money (checklist section 3) is confirmed already out of scope and
untouched this pass.** The only "Razorpay" string in the entire codebase is a seed-data
company name (`IndianData.java:65`, flavor text for a mock enterprise tenant) — there is
no payment SDK, no webhook handler, no escrow logic anywhere. Milestone/bid-award flows
already move fake amounts with no real money ever changing hands (matches the existing
E2E-STATUS.md D4 note about mocked payments). Nothing to hAPI-freeze or feature-flag off;
it was never wired up. Confirmed rather than assumed, then left alone per the ship-it
mission's explicit instruction not to touch this section.

**Flyway adopted, replacing `ddl-auto: update`, via the pg_dump-baseline technique.**
Hand-writing a from-scratch V1 migration for ~30+ JPA entities is slow and error-prone;
instead: let Hibernate's existing `ddl-auto=update` generate the schema one last time
against a scratch database, `pg_dump --schema-only` that as `V1__baseline.sql`, add the
Flyway dependency, flip `ddl-auto` to `validate` (Hibernate now only checks the schema
matches its entities, never alters it), and let Spring Boot's own Flyway auto-integration
apply migrations on every boot — a real CI/CD pipeline to run migrations separately isn't
possible without GitHub Actions, which is blocked on the GitHub push itself (see
BLOCKED.md), but Flyway-on-boot achieves the actual safety goal (versioned, deterministic,
tracked schema changes, no more silent auto-alter) without depending on that pipeline
existing yet.

**Redis: Memurai locally (already running as a Windows service), Railway's Redis addon
for staging.** Used for the JWT `jti` revocation denylist and Bucket4j rate-limit buckets.
No new local install needed; `spring.data.redis.*` reads `${REDIS_URL}` / `${REDIS_HOST}`
etc. so swapping in Railway's managed Redis at deploy time is a pure env-var change.

**JWT stays Bearer-token/localStorage for the access token; only the NEW refresh token
moves to an HttpOnly cookie.** Rewriting arena-web's entire `httpClient.ts` auth model to
cookie-based access tokens this late, across every existing page, is a large blast-radius
change for a staging-hardening pass. Compromise: short-lived (15 min) Bearer access token
(unchanged transport, minimal frontend churn) + a new rotating refresh token issued only
as HttpOnly/Secure/SameSite=Strict, never exposed to JS, used solely to mint new access
tokens via `POST /auth/refresh`. This satisfies the checklist's actual risk concern (a
leaked long-lived token doing lasting damage) without the cookie-CSRF-for-every-endpoint
rework a fully cookie-based access token would require.

**Malware scanning (resume upload) is a documented gap, not implemented.** No ClamAV
binary/daemon is available in this environment, and standing one up as a Railway sidecar
service (container + virus-definition downloads + ongoing update cost) is disproportionate
for a private, unlisted staging environment behind an access gate. Mitigated instead by:
magic-byte content validation (not just extension), a hard size cap, UUID-only filenames,
`Content-Disposition: attachment` + `nosniff` on download (so a malicious file can never
execute in-browser), and DOCX macro-stripping. Full AV scanning stays a Stage-1 fast-follow
once real recruiter traffic exists, tracked in BLOCKED.md.

**GitHub push stays blocked (no `gh` CLI, no token in this session) — Railway deploy does
NOT wait on it.** Confirmed `railway` CLI is already authenticated
(`vikisoltechnologies@gmail.com`) with an existing empty project (`Vikisol-Arena`) in this
workspace. `railway up` deploys directly from the local working directory without
requiring a GitHub-connected repo, so the staging deploy (checklist step 8) proceeds
independently of the GitHub blocker rather than being sequenced behind it. GitHub push
happens the instant a token/repo exists, per the standing rule, but isn't allowed to block
everything else in the meantime — matches this run's own explicit instruction ("keep going
with everything else").

**Postgres Row-Level Security is deferred to a documented fast-follow, not implemented this
pass.** The checklist frames RLS explicitly as "a database-level *backstop*" alongside "explicit
403-vs-200 authorization tests" as the primary control - both matter, but they're not equally
risky to build under time pressure. Correctly wiring `SET app.current_tenant` into every
Hibernate/HikariCP connection acquisition (so RLS policies see the right tenant on every query)
requires either a custom `ConnectionProvider` SPI wrapper or per-transaction AOP with fragile
`@Transactional` advisor-ordering dependencies - genuinely easy to get subtly wrong (e.g. the GUC
lands on the wrong pooled connection, or fires before the transaction begins) in a way that could
silently under- or over-filter legitimate cross-table joins, which is worse than not having RLS
at all without a full regression pass this session doesn't have budget for. Instead: (1) built
`scripts/idor-check.sh`, a checked-in, repeatable live-verification script asserting 403-not-200
across every sensitive object-by-id endpoint with two real seeded tenants - this is the
primary control the checklist actually asks for, and it already found + let us fix 5 real gaps
(see the IDOR-fix commit); (2) the concrete implementation plan for RLS is written down here so a
future pass doesn't start from zero: given `spring.jpa.open-in-view=true` is already active
(confirmed in boot logs), one Hibernate `Session`/connection is bound to the request thread for
its whole duration via Spring's `OpenEntityManagerInViewFilter` - a `Filter` placed after JWT
auth resolves the principal can grab that same request-bound `EntityManager`
(`EntityManagerFactoryUtils.getTransactionalEntityManager`) and issue
`SELECT set_config('app.current_tenant', ?, true)` once per request, reliably landing on the
same connection every later query in that request uses. This needs an empirical ordering check
against Spring Security's filter chain (not assumed correct from reasoning alone) plus a full
regression pass before shipping, which is why it's a fast-follow, not this session's work.

**Redis (Memurai locally) is a hard dependency for sign-in itself, not just rate limiting -
worth flagging as an operational risk.** Discovered mid-session when the local Memurai Windows
service had stopped (unrelated to this work) and every sign-in attempt failed with "Unable to
connect to Redis" - login lockout tracking and the JWT `jti` denylist both live in Redis with no
fallback path. This is *appropriate* for Railway's managed Redis addon in staging/production
(high uptime, not something this app can be running without anyway once rate limiting is live),
but is worth the founder knowing: a Redis outage in production means nobody can sign in, not just
"rate limits stop enforcing." Not changed this pass (graceful degradation would mean auth
succeeding without lockout protection during an outage, which is arguably the wrong trade-off
anyway) - documented so it's a known, deliberate characteristic, not a surprise.

**Rate limiting built as plain Redis INCR+EXPIRE, not Bucket4j.** `RateLimitFilter` reuses the
same `StringRedisTemplate` already wired for `TokenDenylistService`/`RefreshTokenService`
rather than pulling in `bucket4j-redis`, which needs its own separate Lettuce/Jedis connection
setup. A 60-second fixed window keyed by user id (authenticated) or client IP (unauthenticated,
correctly reflecting Railway's proxy once `server.forward-headers-strategy=framework` is set)
gets the same practical 429+Retry-After behavior the checklist asks for with one Redis client
style in the codebase instead of two.

**Found live: a Redis outage in `RateLimitFilter` was taking down the entire API, not just rate
limiting - fixed to fail open.** Mid-session, the local Memurai instance hit a real RDB-
persistence failure (`MISCONF ... stop-writes-on-bgsave-error`, because it was running without
admin rights and couldn't write to its default save location under `Program Files`) and started
refusing all write commands. `RateLimitFilter`'s uncaught `RedisCommandExecutionException` then
took down *every* request, including `/auth/signin` and `/actuator/health` - a Redis blip
degraded from "abuse protection off" to "whole app down." Fixed by wrapping the Redis call in a
try/catch that logs a warning and lets the request through on failure. This is a deliberately
different tradeoff from `TokenDenylistService`/`RefreshTokenService`, which correctly stay
fail-closed (a Redis outage blocking auth entirely is the safe failure mode there - see the
earlier "Redis is a hard dependency for sign-in" entry); for rate limiting specifically,
fail-open is the safer default. Local fix: restarted Memurai with `--save "" --dir <writable
path>` so this can't recur in dev; Railway's managed Redis addon won't have this specific
permissions problem, but the code-level fix is the one that actually matters for staging/prod
resilience against any transient Redis issue.

**Account deletion (right-to-erasure) anonymizes + disables rather than hard-deletes.**
`CandidateProfile` and `User` rows are kept (applications/interviews/messages/audit events all
hold FK references to them - cascading a real delete through every one of those safely is a much
larger, riskier change than this pass has budget for), but name/bio/skills/CV are cleared, the
CV file is deleted from disk, `User.deletedAt` is set (new `V2__account_deletion.sql`,
`AuthService.signIn()` now rejects any account with a non-null `deletedAt`), every refresh token
for the user is revoked, and the access token making the deletion request itself is denylisted
immediately (mirrors `AuthService.signOut()`'s exact denylist call - without this the still-live
15-minute access token could keep calling other endpoints and partially un-anonymize what was
just erased). Verified live end-to-end: created a throwaway account, deleted it, confirmed
sign-in afterward returns 401 and the just-used access token itself immediately returns 401 too
rather than continuing to work for its remaining lifetime.

**AI-use disclosure (checklist §3) added as one line in the agent chat panel, not a rewrite of
the app's "your agent" voice.** The personified-agent copy throughout the app ("your agent
scanned...", Autopilot's description, etc.) is core brand identity (CLAUDE.md's own "The
Companion" design direction), not something this pass should gut. The actual legal-honesty risk
is narrower: nothing should claim something is happening autonomously *right now* that isn't. A
single disclosure line was added directly in `/agent` (`src/app/agent/page.tsx`, right under the
chat header, where the agent literally proposes actions) stating matching/drafting is
algorithmic and every application/bid needs approval unless Autopilot is on - true today, and
satisfies "add an AI-use disclosure in the UI where the agent acts" without a wholesale content
rewrite that would fight the product's own design brief.

**Sentry (frontend) wired via `instrumentation.ts` + `instrumentation-client.ts`, no
`withSentryConfig` build-time source-map upload.** Mirrors arena-api's existing dormant-unless-
DSN-set pattern (`sentry-spring-boot-starter-jakarta` already in `pom.xml`, config already in
`application.yml`). The Sentry Next.js wizard's usual `next.config.ts` wrapper uploads source
maps at build time via a Sentry auth token this environment doesn't have (see BLOCKED.md) -
skipped rather than half-configured; error capture still works, stack traces just won't be
de-minified in the dashboard until that token exists. Verified with a full `next build`, not
just `tsc`/`eslint` - Sentry's Next.js integration has broken builds via webpack-plugin
interactions in other projects before, so a type-check pass alone wasn't enough confidence here.

**Local `next build` needs `NODE_OPTIONS=--max-old-space-size=3584` in this sandboxed dev
environment - not a code issue.** `npm run build` OOM'd with the default Node heap; the machine
this session runs on has only 5.8GB total RAM with well under 1GB free at the time (VS Code +
several Java/Node dev processes already running), not something a Next.js app of this size
should need extra headroom for on a normal CI/build machine. Confirmed the actual code compiles
and typechecks cleanly (`tsc`/`eslint` both clean) - this is purely a local resource ceiling.
Noted here because the Railway deploy step needs the same `NODE_OPTIONS` set on its build command
defensively, even though Railway's build infrastructure has far more headroom than this VM.

**DB backup + restore drill: actually run, not just scripted.** `arena-api/scripts/backup-db.sh`
(`pg_dump --format=custom`) and `restore-db.sh` (restores into a separate `arena_restore_drill`
database by default, never the live one, unless `RESTORE_DB_NAME` is pointed at it explicitly).
Ran both for real against the local dev database: backup produced a 132KB dump, restore
recreated 43 tables with 62 rows in `arena_users` matching the live count - a genuine tested
restore, not just a script that's never been executed (PRODUCTION-CHECKLIST.md's own words: "an
untested backup is not a backup"). The drill database was dropped again afterward. Automated
daily scheduling isn't wired up yet (needs a Railway cron service or GitHub Actions schedule,
and GitHub push is still blocked - see BLOCKED.md) - tracked there as the next step once either
exists; the mechanism itself is proven to work today.

**Found a live production Arena deployment already on Railway - deliberately not touched, deployed
into a brand-new isolated project instead.** The `railway` CLI's existing "Vikisol-Arena" project
(the one referenced as already-authenticated in the earlier GitHub-push DECISIONS.md entry) turned
out to have real services already running, not an empty shell: `Vikisol-Arena-BE`
(`SPRING_PROFILES_ACTIVE=prod`, real Cloudinary/Google OAuth credentials, a webhook wired to the
production `vikisol-one-be-production.up.railway.app` backend, serving `https://api-arena.vikisol.in`
for a frontend at `https://arena.vikisol.in`) plus its own Postgres with a persistent volume. This
predates this session's full rewrite (CLAUDE.md's Aug-1 pivot note) and is almost certainly a real,
live, founder-owned production deployment of the old Arena backend - completely incompatible with
this session's schema/entities regardless, and not something a staging-hardening pass should ever
redeploy over or connect to. Only read-only inspection was performed (`railway status`,
`railway variables --json`) - no writes, no deploys, nothing modified. A brand-new, separately-named
`arena-staging` Railway project (empty, freshly created) is used for everything in this section
instead, so the existing production service is never at risk. **Flagging this prominently since
the founder may want to know this exists** - it wasn't mentioned anywhere in this session's own
history before now, and it's live infrastructure with real paid-service credentials in it.

## ARENA-ENTERPRISE-SUITE.md — foundation architecture (2026-08-03)

**Role model**: extend the existing single `Role` enum (already the sole RBAC source of
truth on `User`, checked via Spring Security `hasRole()`/`hasAnyRole()`) rather than
introducing a separate per-membership role. New values: `TALENT`, `RECRUITER`,
`COMPANY_ADMIN`, `HIRING_MANAGER`, `PLATFORM_ADMIN`. The old `ENTERPRISE` value is
retired — every existing enterprise account today is already the sole owner of their
`EnterpriseProfile`, which is exactly `COMPANY_ADMIN`'s semantics, so migration is a
straight rename: `ENTERPRISE → COMPANY_ADMIN` for all existing seeded/created rows.
Kept `hasRole()` (not a new claim-shape) so the JWT format and `UserPrincipal` need no
structural change — just more enum values.

**Tenant model**: `EnterpriseProfile` becomes the tenant root — it already carries
`plan`/`seatsTotal`/`unlockCreditsTotal`, which is exactly what the spec's "tenants
gain: plan, seat_limit, credits_balance, status" asks for. Not introducing a separate
`Tenant` entity that would just duplicate this. Its existing `user` field (1:1) is kept
as "the founding admin" for backward compat, but is no longer the access-control source
of truth.

**New `Membership` entity** (`user`, `tenant` [FK → EnterpriseProfile], `status`
[INVITED/ACTIVE/SUSPENDED], `invitedBy`, `joinedAt`) is the real many-users-per-tenant
link. A backfill step gives every existing enterprise `User` an ACTIVE `Membership` to
their own `EnterpriseProfile` so tenant resolution is uniform going forward — every
enterprise-ish request resolves its tenant via `Membership`, not via
`EnterpriseProfile.user` directly. This replaces the ~6 existing
`enterpriseProfileRepository.findByUserId(userId)` call sites (JobPostingService,
ApplicantService's callers, TalentSearchService, ShortlistService,
EnterpriseProfileService, ConversationService) with one shared resolver.

**Existing enterprise endpoints widened, not rewritten**: the 5 controllers currently
gated `@PreAuthorize("hasRole('ENTERPRISE')")` (JobPosting, Applicant, TalentSearch,
Shortlist, EnterpriseProfile) become
`@PreAuthorize("hasAnyRole('RECRUITER','COMPANY_ADMIN')")` — both roles get the full
recruiter workspace, matching "Company Admin console = everything a recruiter sees +
Admin console." Hiring managers do NOT get these roles (spec HM4: no pipeline/search/
postings for them).

**Audit logging is explicit, not aspect-based.** Given the time cost of getting an
AOP/interceptor layer correct vs. just calling `auditService.record(...)` at each of the
spec's named action sites (posting created/closed, candidate unlocked, credit spent,
stage moved, interview scheduled, feedback submitted, message sent, member invited/
removed, plan changed), explicit calls were chosen — slower to wire everywhere but far
easier to verify each one is correct and complete. A generic aspect can replace these
call sites later without changing the `AuditEvent` shape.

**JWT unchanged (no `tenantId` claim added)**: tenant is resolved per-request via
`Membership` lookup (one extra indexed query), the same cost the existing
`findByUserId` calls already paid. Adding a `tenantId` claim would save that query but
means reissuing tokens on tenant changes (membership removal, tenant suspension) — for
this scope, an extra `SELECT` per request is worth avoiding that staleness risk.

**Platform admin has no tenant.** `PLATFORM_ADMIN` users have no `Membership` row and
no `EnterpriseProfile` — `/admin` endpoints resolve nothing tenant-scoped, they operate
across all tenants directly. Exactly one seeded account, credentials documented in
arena-api's README (per spec PA7).

**Role-based landing**: `recruiter` → `/enterprise/dashboard` (existing workspace),
`company_admin` → `/enterprise/admin` (new dashboard), `hiring_manager` →
`/enterprise/interviews/mine` (new, lite), `platform_admin` → `/admin`. Route guards
enforced both client-side (redirect) and server-side (`@PreAuthorize`) — never trust
the client alone, per the spec's own instruction.

**Known gap, deliberately not fixed this pass**: `NotificationService` (new applicant, interview
confirmed) always notifies `job.getEnterprise().getUser()` - the tenant's founding admin only,
never whichever recruiter actually owns the posting. This was true before this suite too (every
tenant had exactly one user), but now that multiple recruiters can share a tenant it's a real gap:
a non-founding recruiter never gets notified about their own postings. Fixing it properly means
`notify()` fanning out to every ACTIVE membership on the tenant (or at least the posting's
creator, once postings track who created them) rather than a single hardcoded recipient - a
real behavior change, not a one-line fix, so it's deferred rather than rushed. The three
ownership-check bugs found alongside it (JobPostingService.setStatus,
ApplicationService.advanceStageAsEnterprise, InterviewService.submitFeedback/assertParticipant -
all compared against the founding user's id and would incorrectly reject a legitimate
non-founding recruiter/company_admin) WERE fixed, since those are wrong-access bugs, not just
incomplete fan-out.

**Build order followed exactly as specified**: foundation (this entry) → Company Admin
console → Hiring Manager lite → Platform Admin console → full regression (personas A-F
still green) → new personas G/H/I → tag `v1.1-enterprise-suite`. Given the scope, the
three consoles are being built as their own coherent, committed chunks rather than one
giant commit, so a resume point always exists if the session is interrupted (same
pattern E2E-STATUS.md serves for the previous sprint).

## Platform Admin console (PA1-PA7) (2026-08-04/05)

**Moderation queue has no reporting UI - it's fed by an automatic banned-phrase scan
instead.** Building a full "report this posting" flow for candidates/recruiters was out
of scope for this pass. `ModerationService.autoFlag()` scans a new posting's
title+description against a small static phrase list (`"guaranteed income"`, `"pay to
apply"`, etc.) at creation time (`JobPostingService.createPosting`) and files a
`ModerationItem` if anything matches. Good enough to demonstrate a working queue
end-to-end (verified live: created a real posting with a flagged phrase via curl, it
appeared in the PA moderation queue immediately, dismiss/take-down both round-tripped
correctly) without overbuilding a reporting system nobody asked for yet.

**PA2 (subscriptions) always requires a `reason` string, even for a pure plan change**
- unlike CA4's self-service `changePlan` (which just bumps seats/credits to the new
plan's minimums, no explanation needed since the tenant is changing their own plan),
platform_admin changes belong to someone *else's* tenant and get written to that
tenant's own audit log, so a one-line justification is mandatory, not optional. Credit
deltas can be negative (clawback) as well as positive (goodwill grant), and are also
written to `CreditLedgerEntry` so they show up in the tenant's own billing history, not
just the platform-wide audit feed.

**PA7's "404, not 403" is a frontend-only concern.** `PlatformAdminController` still
returns a normal 403 JSON body when `@PreAuthorize("hasRole('PLATFORM_ADMIN')")` fails -
that's correct and sufficient for an API response nobody browses to directly. The actual
"don't reveal this route exists" requirement is about what a human sees in a browser:
`PlatformAdminShell` renders the exact same `not-found.tsx` a genuinely nonexistent URL
would show (imported directly as a component, not navigated to) rather than redirecting
to `/dashboard` or `/auth` - a redirect would still confirm to a curious visitor that
`/admin` is a real, gated route, even if they can't get in.

**Found + fixed a real bug live-testing PA7**: a signed-in wrong-role session (tested
with a hiring_manager account) visiting `/admin` rendered the correct 404 UI, but each
`/admin/**` page's own data-fetch `useEffect` still fired on mount regardless - a page
component's hooks run the moment *that component* mounts, completely independent of
what a *child* component (`PlatformAdminShell`) decides to render internally. So the
browser still sent a real (server-rejected, no data leaked) request to
`GET /admin/dashboard` etc. before the shell's own check had even resolved - exactly the
kind of stray authenticated-looking noise this surface shouldn't make. Fixed by
exporting `usePlatformAdminGate()` from `PlatformAdminShell.tsx` and having every PA
page call it directly, gating its own fetch effect on `gate === "ready"` rather than
relying on the shell alone. Re-verified after the fix: zero network calls fire for an
unauthenticated or wrong-role visit to any `/admin/**` route.

## Step 4 domain verification — TLS cert still provisioning (2026-08-06)
DNS confirmed propagated correctly (arena.vikisol.in -> 55amzai3.up.railway.app /
69.46.46.104; api-arena.vikisol.in -> vvh1z4s9.up.railway.app / 69.46.46.115-ish range).
Railway domain list shows both custom domains `syncStatus: ACTIVE`. However direct TLS
inspection (`openssl s_client -servername <host>`) shows BOTH edges still presenting the
generic `subject=CN=*.up.railway.app` wildcard cert, not one covering the custom hostname
-> Windows curl/schannel correctly refuses this as SEC_E_WRONG_PRINCIPAL. This produced the
earlier confusing symptoms: arena-web appeared to return 200 with `Server: Vercel` headers
only because this machine's own DNS cache was stale and pointed at the OLD Vercel IP
(76.76.21.21) at that moment -- flushing the local resolver cache (`ipconfig /flushdns`)
fixed DNS resolution but exposed the real, separate issue (Railway hasn't finished issuing
Let's Encrypt certs for the two custom domains yet). This is expected/normal right after a
DNS change -- Railway needs to detect the now-correct DNS before it can complete ACME
issuance, which was blocked while DNS was still on the wrong record. No action needed here
except to wait and re-check; polling in background.

## Step 4 domain verification — real root cause found: missing TXT ownership-verification records (2026-08-06)
Correction to the previous entry's framing ("just needs time"): after the 20-min background
poll showed zero movement, `railway domain status <domain>` (a more detailed command than
`railway domain list`, not checked earlier) revealed `Verified: no` and a required
`_railway-verify.<subdomain>` TXT record for each domain that was never included in the
original 3-item DNS instruction handed to Syam in BLOCKED.md — that instruction only covered
the CNAME. Railway will not attempt Let's Encrypt issuance at all until this TXT record
proves ownership, regardless of how correct the CNAME is or how long we wait; confirmed
`railway domain certificate retry` itself refuses to run ("only available after certificate
issuance fails") because it's not even failed yet — it's stuck at ownership validation.
This is why the app looked "not online" even after DNS was confirmed propagated. Fix: two
TXT records added to BLOCKED.md for Syam. No code/infra changes needed beyond that — once
the TXT records are live, Railway's own automation issues the cert without further action.

## TXT verification check — found a value mismatch, not just a missing record (2026-08-06 ~21:56 UTC)
Polling turn found `_railway-verify.arena` still absent from public DNS entirely, but
`_railway-verify.api-arena` present (confirmed on both 8.8.8.8 and 1.1.1.1, so not a resolver
fluke) with value `railway-verify=949939f8...` — which does NOT match what Railway currently
expects for the new arena-api service's binding (`railway-verify=cfd51b1eec713a3f6...`).
Likely explanation: the OLD Vikisol-Arena-BE service held this same hostname from 2026-07-05
until it was released in Step 3, and may have required (and gotten) its own TXT value at
some point — different services get different verification tokens for the same hostname, so
a stale value from the old binding wouldn't satisfy the new one. This is a real blocker no
amount of waiting fixes (unlike simple propagation delay), so flagged to Syam directly in
BLOCKED.md with the exact delete/re-add correction needed, rather than continuing to poll
silently as if it were just a matter of time.

## ARENA-PERFORMANCE.md (v2) — corrected the mobile-orb fix to tier quality, not remove the scene (2026-08-07)
The prior mobile-lag investigation (same day, earlier) made PersistentOrb and
CareerHealthGauge swap to a flat CSS gradient on mobile/low-power viewports, on the
reasoning that a persistent WebGL render loop was a disproportionate cost for a small
decorative element. ARENA-PERFORMANCE.md's v2 makes this explicitly non-negotiable in the
other direction: "the 3D stays. Every 3D scene currently in the app remains, on desktop
AND mobile... do NOT permanently downgrade mobile to a static image." That's a direct,
intentional product-identity call from Syam, not something to route around - reverted the
viewport/hardwareConcurrency-driven fallback.

What replaced it, matching Step 2's "quality tiers, not on/off": OrbScene and
HealthOrbScene now take a `quality?: "full" | "lite"` prop. PersistentOrb/CareerHealthGauge
pass "lite" on mobile/low-power (same useIsMobileViewport signal, repurposed) - lite drops
icosahedron subdivision (6→3 / 5→3), caps dpr to a flat 1 instead of [1, 1.5], and disables
antialiasing + the second point light. The scene is still real WebGL, still the same
design, just cheaper geometry - never a CSS swap. prefers-reduced-motion remains the ONLY
thing that shows the static disc, since that's an explicit accessibility signal a user
opted into, not a capability guess.

Added on top, applying to every quality tier (desktop included) since it's a pure win with
no visual cost: both Canvases now pause their frameloop ("never" instead of "always") via
a new usePageVisible() hook whenever the tab is hidden - Step 2's own framing of this as
"the single biggest battery/CPU win on phones." This doesn't touch what renders, only
whether it's rendering at every moment.
