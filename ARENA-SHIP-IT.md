# ARENA-SHIP-IT.md — Final run: harden, test, deploy to live staging, hand back test logins

> Read fully. Work CONTINUOUSLY to the end. This file + E2E-STATUS.md + git log +
> PRODUCTION-CHECKLIST.md are your memory — on any context reset, reopen them, find the
> first unchecked item, continue. No questions to Syam; decisions → DECISIONS.md;
> anything needing a credential Syam hasn't given → BLOCKED.md, then skip and continue.
>
> TARGET OF THIS RUN: a fully deployed, live, testable **STAGING** environment on
> Railway (frontend + backend + Postgres), code pushed to private GitHub, with working
> dummy logins for every role. This is NOT a public production launch — see the LAUNCH
> GATE at the bottom. Staging is private/unlisted and takes no real money.

## Credentials expected this run (if any are missing → BLOCKED.md, keep going with the rest)
- GitHub: token + org (VikisolTechnologies) to create private repos arena-web, arena-api, push all tags.
- Railway: API token / project access to create arena-web, arena-api, Postgres services.
- Staging domain (e.g. arena-staging.vikisol.in) + Cloudinary + Resend keys — only when you reach deploy; if absent, deploy to Railway's default *.up.railway.app domain and note the custom-domain step in BLOCKED.md.

## ORDER OF WORK

### 1. Push to GitHub FIRST (before any new code)
Create private repos, push arena-web + arena-api with all history and tags
(v1.1-enterprise-suite). If no token in this session → BLOCKED.md as the top item, and
STILL do everything else locally so it's push-ready the instant a token arrives.

### 2. Security hardening (LAUNCH-BLOCKING items from PRODUCTION-CHECKLIST.md)
Implement, commit, and verify each:
- **Secrets:** move every key to env vars; generate fresh staging secrets (JWT signing
  key, DB, Cloudinary, Resend, LLM). Nothing hardcoded; no .env committed; .env.example
  documents every var.
- **JWT/auth:** short-lived access token + rotating refresh token in HttpOnly/Secure/
  SameSite cookies; server-side revocation (jti denylist in Redis or DB); validate all
  standard claims; bcrypt/argon2 password hashing; login lockout/backoff.
- **2FA (TOTP) for platform_admin and company_admin** roles.
- **Multi-tenant isolation:** Postgres Row-Level Security keyed by tenant; app runs as a
  non-owner DB role; propagate tenant context into background jobs; scope cache keys by
  tenant. Then write automated tests asserting **403 (not 200)** when a user requests
  another user's / another tenant's objects by ID across EVERY sensitive endpoint
  (resumes, unlocks, messages, bids, interviews, applicants, admin). These tests must pass.
- **Input/OWASP:** parameterized queries only; Bean Validation on all DTOs; output-encode
  user content (messages, bios, job posts) against stored XSS; CSRF handling for cookie
  auth; security headers (CSP, HSTS, nosniff, X-Frame-Options).
- **Resume upload:** validate by magic bytes (not extension/MIME); server-side size cap;
  UUID filenames; malware scan (ClamAV or scanning API) before recruiter access; signed
  expiring Cloudinary URLs; Content-Disposition attachment + nosniff.
- **Rate limiting:** Bucket4j (Redis-backed) with 429 + Retry-After on login, password
  reset, upload, contact-unlock, messaging, and EVERY AI-agent action.

### 3. AI-agent guardrails (LAUNCH-BLOCKING)
- Human-in-the-loop confirmation required before the agent submits an application or sends
  a message (autopilot stays behind Pro AND behind a hard per-day cap on applications/
  messages; dedupe; abusive-pattern block).
- Resume tailoring may ONLY rephrase/reorder true user-provided facts — never invent
  experience, employers, dates, or skills. Add a validation pass that rejects any
  generated claim not grounded in the user's stored profile.
- Treat external content (job postings, messages) as untrusted: segregate from
  instructions; validate agent tool outputs; per-user token/action budget caps with a
  hard stop; log every agent action (actor, time, on-whose-behalf, inputs, outputs,
  approval) to the immutable audit trail.
- Add an AI-use disclosure in the UI where the agent acts.

### 4. Cost efficiency (Syam is cost-sensitive — enforce)
- Backend: pagination on every list; cache headers/ETag; batch endpoints (no N+1 from FE);
  index tenant_id + all FK/filter columns; Redis cache on hot reads; connection pooling;
  liveness via SSE/WebSocket only where needed — NO polling loops.
- LLM: prompt caching for the system/agent prompt; explicit max_tokens; cheap-model
  routing for simple tasks; model IDs configurable (not hardcoded); token usage logged
  per call site with an anomaly alert.

### 5. DPDP consent scaffolding (build the mechanism; legal copy is Syam's job)
- Per-purpose consent capture at onboarding (auto-apply, enterprise-visibility) already
  exists — extend to: a consent audit log (timestamp + version), one-tap withdrawal that
  immediately removes the candidate from Talent Universe results, a data-export + delete
  (right-to-erasure) self-serve action, and placeholder routes for Privacy Policy / ToS /
  Cookie banner (reject option) wired in, with TODO markers for Syam's legal copy in
  BLOCKED.md. A breach-notification runbook stub in the repo.

### 6. Reliability (LAUNCH-BLOCKING for staging)
- Sentry on frontend + backend; uptime health-check endpoints (excluded from rate limits).
- Flyway/Liquibase migrations run in CI/CD; backward-compatible; never destructive without
  backup.
- Automated daily Postgres backup to external object storage + a **tested restore** you
  actually run once and log in DECISIONS.md. TLS enforced; graceful degradation
  (timeouts/retries/circuit-breakers) when Cloudinary/Resend/LLM are down.

### 7. Testing & full E2E gap sweep
- Integration tests: auth, the 403 tenant-isolation suite, credit-ledger/billing math,
  consent withdrawal.
- Playwright E2E on every critical journey in BOTH mock and real mode; walk the entire
  E2E-STATUS.md (personas A–I) and fix anything red, then tick it.
- Every list has loading/empty/error states; every third-party failure degrades to a clear
  error, not a blank screen. Zero console errors; clean lint; clean build; 390px mobile +
  reduced-motion verified.

### 8. Deploy to LIVE STAGING on Railway
- arena-api + Postgres + arena-web as Railway services, real mode
  (NEXT_PUBLIC_API_MODE=real), staging secrets, migrations applied, seed script loaded.
- Run the full smoke test against the live URL: signup → onboard → upload resume → apply →
  interview → bid → award → enterprise search → unlock → message → admin views → platform
  admin. Fix anything that breaks in the deployed env, redeploy, re-smoke.
- Configure custom staging domain if DNS/keys provided; else use the Railway URL and note
  the domain step in BLOCKED.md.
- Keep staging PRIVATE: add noindex + a simple access gate (basic auth or an allowlist) so
  it is testable-by-link but not public/indexed.
- Tag `v1.2-staging-live`.

### 9. Create + hand back dummy logins
Seed one working account per role and write them to TEST-LOGINS.md at the repo root AND
print them in your final summary:
- Talent (onboarded, with data), Recruiter, Company Admin, Hiring Manager, Platform Admin,
  plus a Project Poster and a Bidder if those are separate accounts.
For each: email, password, role, which company/tenant, and a one-line "what to test here."
Use non-real demo emails (e.g. talent.demo@arena-staging.test) and clearly-marked demo
passwords. These are staging-only throwaways.

### 10. Final report
Write SHIP-REPORT.md: what's deployed, the live staging URL, the test logins, what's green
in E2E-STATUS.md, and the exact remaining human-only launch-blockers (below).

---

## THE LAUNCH GATE — do NOT cross without Syam
Public production launch to real users / real money stays BLOCKED on items only Syam can
clear. List them in SHIP-REPORT.md, do not attempt them:
- Published, lawyer-reviewed Privacy Policy, Terms, Acceptable-Use (DPDP-aligned).
- GST registration + Razorpay merchant KYC before charging anyone; marketplace-money
  (milestone/escrow) and agent Autopilot stay OFF in staging.
- Third-party pentest booked; PITR-grade DB backups confirmed.
- Syam's explicit "go public" after reviewing staging.
Everything up to and including a fully working, credential-hardened, private live staging
with test logins — do all of it this run, without stopping.

## Definition of done for this run
Code on GitHub (or BLOCKED.md top item if no token) · hardening + guardrails + cost +
consent-mechanism + reliability committed · E2E-STATUS.md green both modes · deployed live
to private Railway staging · TEST-LOGINS.md + SHIP-REPORT.md written · tag v1.2-staging-live.
