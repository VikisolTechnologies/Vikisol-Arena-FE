# SHIP-REPORT.md — ARENA-SHIP-IT.md final run

**Result: a fully deployed, live, private staging environment on Railway, hardened per
PRODUCTION-CHECKLIST.md's Stage 0 list, smoke-tested end-to-end across all five roles.**

## What's live

| | URL |
|---|---|
| Frontend (arena-web) | https://arena-web-production-f1f4.up.railway.app |
| Backend (arena-api) | https://arena-api-production-a01d.up.railway.app/api/v1 |

Both on a fresh, isolated Railway project (`arena-staging`) with managed Postgres and Redis —
**not** the pre-existing "Vikisol-Arena" project, which turned out to already hold a live
production deployment (see below). Frontend is gated behind HTTP Basic Auth + `X-Robots-Tag:
noindex` — testable by link, not public or indexed. Test accounts and what's seeded behind each
are in **TEST-LOGINS.md**.

## ⚠️ Found existing live production infrastructure

The founder should know: Railway's pre-authenticated "Vikisol-Arena" project already contained
a real, live production Arena deployment (`Vikisol-Arena-BE`, `SPRING_PROFILES_ACTIVE=prod`,
real Cloudinary/Google OAuth credentials, a webhook to the production `vikisol-one-be-production`
backend, serving `arena.vikisol.in` / `api-arena.vikisol.in`) — apparently from before this
project's full rewrite. It was not touched (read-only inspection only); this run's entire
staging deployment happened in a brand-new, separate project instead. Full details in
BLOCKED.md and DECISIONS.md. Worth a look to decide whether it should be retired.

## Hardening completed this run (arena-api + arena-web)

- **JWT**: short-lived (15min) access tokens, rotating opaque refresh tokens in HttpOnly/Secure/
  SameSite=None cookies (cross-subdomain, since frontend/backend are on different Railway
  domains) with reuse detection, server-side `jti` denylist on sign-out, login lockout (5
  attempts → 15min), mandatory-eligible TOTP 2FA for company_admin/platform_admin.
- **Multi-tenant isolation**: 5 real IDOR gaps found and fixed via a systematic endpoint audit
  (cross-tenant posting/applicant/interview reads, a candidate-unlock paywall bypass, fully
  unauthenticated file serving) — verified via a checked-in `scripts/idor-check.sh`, run
  against both local dev and this live staging deploy. Postgres Row-Level Security itself is a
  documented, deliberately-deferred fast-follow (see DECISIONS.md) — the IDOR test suite is
  this pass's actual primary control, matching how the checklist frames RLS as a backstop
  alongside those tests, not a replacement.
- **File uploads**: magic-byte content validation (not just extension), signed + 10-minute-
  expiring download URLs (HMAC-SHA256), `Content-Disposition: attachment` + `nosniff`.
- **Rate limiting**: Redis-backed (plain INCR+EXPIRE, not Bucket4j — one Redis client style
  instead of two), per-bucket limits on auth/upload/unlock/messaging endpoints, fails open on a
  Redis outage (found live: a local Redis persistence failure was taking down the whole API
  before this fix, not just rate limiting).
- **Security headers**: CSP, HSTS, `X-Robots-Tag: noindex` on staging.
- **DPDP self-service rights**: consent-change audit log, data export (`GET /profile/me/export`),
  right-to-erasure (`DELETE /profile/me` — anonymizes profile, deletes CV, disables the account,
  revokes every session immediately including the one making the request), draft `/privacy`
  `/terms` `/aup` pages, a cookie-consent banner.
- **AI-use disclosure**: one line in `/agent`'s chat panel — matching/drafting is algorithmic,
  every application/bid needs approval unless Autopilot is on. (Full AI-agent guardrail work,
  checklist §8, was N/A this pass: a full codebase audit found zero live LLM integration
  anywhere — "the agent" is deterministic scoring + templated copy, nothing autonomous to gate.)
- **Reliability**: Sentry wired dormant (both apps, no-ops until `SENTRY_DSN` is set), a real
  `pg_dump`/`pg_restore` backup+restore drill actually run (not just scripted) — 132KB backup,
  43 tables/62 rows restored correctly into a scratch database.
- **Deploy config**: multi-stage Dockerfiles for both apps, `railway.toml`, all secrets freshly
  generated for this environment (never reused from local dev).

## Real bugs found and fixed live (not in code review — by actually deploying and clicking)

1. Five IDOR gaps (above).
2. `signOut()` never called the backend — access tokens stayed valid after "signing out."
3. A Redis outage crashed the whole API via the new rate limiter (now fails open).
4. JDBC connection string needed a `jdbc:` prefix and separate username/password — Railway's
   `DATABASE_URL` embeds credentials in a `user:pass@host` form the Postgres JDBC driver
   (unlike most other Postgres clients) doesn't accept.
5. The Basic Auth staging gate blocked Railway's own healthcheck prober, killing every deploy
   right after a successful build — added a dedicated unauthenticated `/api/health` route.
6. **The most consequential one**: `DataSeeder`'s "already seeded" guard checked
   `userRepository.count() > 0`, but `RoleMigration` (which runs first) unconditionally seeds
   the platform admin regardless of whether `DataSeeder` has ever run — so on a genuinely fresh
   database, `DataSeeder` saw one user and skipped seeding literally everything else (companies,
   candidates, postings, applications, interviews, marketplace). Never surfaced before because
   local dev always ran against an already-populated database. Fixed the guard, then fixed a
   second-order collision (`DataSeeder`'s own admin/recruiter/hiring-manager inserts weren't
   existence-checked either, once they actually got a chance to run). Confirmed live: the
   deployed database now has 4 postings, 33 candidates, and real audit-log activity.

## Verification performed

- `scripts/idor-check.sh`: 9-10/10 passing against both local dev and live staging (the one
  occasional skip is a data-shape issue — not every random applicant has an interview yet —
  not a failure; covered separately where an interview does exist).
- Full production `next build` (not just typecheck) — all 44 routes compile clean.
- Live Playwright smoke test against the **deployed staging URLs** (not localhost) across all
  five roles — talent, company_admin, recruiter, hiring_manager, platform_admin — plus
  candidate discover/applications/marketplace and enterprise Talent Universe search/postings.
  **Zero console errors across every screen.**
- A real backup → restore drill, not just a script that's never been run.
- Consent-audit-log write, full data export, and full right-to-erasure round-trip (delete →
  old token immediately 401s → re-sign-in 401s) verified via curl against live staging.

E2E-STATUS.md's persona A-I functional walkthroughs (the detailed step-by-step user-journey
matrix) were built and verified green earlier in this project's history, in both mock and real
mode against local dev — that remains the source of truth for feature-level correctness and
wasn't re-walked row-by-row against this specific staging deployment (a full ~130-row re-walk
was outside this run's time budget on top of everything above). What this run added on top is
the infrastructure/security hardening layer and confirmation that the actual deployed
environment serves every role's landing experience correctly with zero errors.

## Launch gate — still blocked on the founder, not attempted

Per ARENA-SHIP-IT.md's explicit instruction, these were not touched:
- Published, lawyer-reviewed Privacy Policy / Terms / AUP (current versions are clearly-marked
  drafts — see `/privacy`, `/terms`, `/aup`).
- GST registration + Razorpay merchant KYC (marketplace payments aren't built at all yet —
  confirmed via a full codebase audit, only a seed-data flavor-text "Razorpay" string exists).
- Third-party penetration test.
- PITR-grade database backups (staging uses on-demand `pg_dump`, proven working; production
  would want Railway's paid tier or a migrated managed-Postgres provider with continuous backup).
- The founder's explicit "go public" sign-off after reviewing this staging environment.

## Also still blocked

- **GitHub push** — no `gh` CLI, no token in this session. Both repos are fully committed
  locally, ready to push the instant either exists. See BLOCKED.md.
- Custom domain (using Railway's `*.up.railway.app` domains for now — fine for staging).
- `SENTRY_DSN` unset (dormant, safe) — set it once a Sentry project exists.
- Object storage: CV uploads use local disk on Railway's ephemeral filesystem — lost on
  redeploy. Fine for a short-lived staging demo; flagged in BLOCKED.md for anything longer-lived.

## Tags

`v1.2-staging-live` on both `arena-web` and `arena-api` (local tags — will push alongside the
repos once GitHub access exists).
