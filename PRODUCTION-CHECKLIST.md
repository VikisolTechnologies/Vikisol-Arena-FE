# PRODUCTION-CHECKLIST.md — Arena Production-Readiness Checklist: From Localhost to Real Users and Real Money

Source: research pass commissioned by Syam (arena-final1.pdf), saved here as the durable
reference ARENA-SHIP-IT.md points at. Condensed to the actionable items; full legal/regulatory
citations live in the original PDF if needed later.

## TL;DR

- **Do not launch the marketplace-money and AI auto-apply features on day one.** Everything else
  (talent search, resume upload, messaging, interview room) can go live safely first, but only
  after clearing: multi-tenant data isolation (Postgres RLS + IDOR/403 tests), production secrets
  rotation, JWT/refresh-token hardening, a *tested* backup/restore, error tracking + uptime
  monitoring, a DPDP-compliant consent flow and privacy notice, and TLS/custom-domain hardening.
- **India regulation is the single biggest hidden risk.** DPDP Rules 2025 (notified 13 Nov 2025)
  run a three-phase clock — Data Protection Board effective 13 Nov 2025, Consent Manager
  registration opens 13 Nov 2026, substantive obligations enforceable 13 May 2027 — but consent
  and breach-notification duties should be built now. RBI Payment Aggregator Directions 2025 (15
  Sept 2025) mean Arena must **never hold customer funds in its own account**: a licensed PA
  (Razorpay) must hold funds in escrow, and Razorpay Route's marketplace split now requires >₹40
  lakh turnover plus per-seller onboarding.
- **Railway is fine for staging and a soft launch but is not the safest choice for money-handling
  production.** Either harden it heavily (external automated Postgres backups, uptime monitoring,
  staging separation) or migrate the paid-tier workload to a platform with managed Postgres
  point-in-time recovery and an uptime SLA before taking enterprise money.

## Key Findings

1. **The marketplace payment feature is legally the hardest thing built and should ship last.**
   Under RBI PA Directions 2025, a PA business shall not carry out marketplace business, and a PA
   may aggregate funds only for the merchant with a contractual relationship. Compliant structure:
   Arena is a merchant/marketplace, a licensed PA (Razorpay) holds all customer funds in a
   Scheduled Commercial Bank escrow account, milestone holds execute via Razorpay Route's
   `on_hold_until`. If Arena holds funds itself it becomes an unlicensed PA — PA authorisation
   requires ₹15 crore minimum net-worth at application, ₹25 crore by year 3. Not attempted by a
   lean startup; Arena stays a merchant, never a PA.
2. **Razorpay Route eligibility tightened after Sept 2025.** Domestic turnover >₹40 lakh (or
   export >₹5 lakh) in FY25/FY26 + a Payer-Payee Transparency declaration required for marketplace
   splits. Freelancer/seller payees must be onboarded on Arena's own platform and be the
   customer-facing party; direct third-party settlement is restricted to payees above the ₹40-lakh
   threshold.
3. **DPDP Act 2023 + DPDP Rules 2025 apply to Arena as a Data Fiduciary today.** Candidate PII,
   "consent to be searched," and contact-unlocking are core to the product, so consent must be
   free, specific, informed, unconditional, unambiguous, collected against a plain-language
   notice, with one-tap withdrawal as easy as opt-in, and 72-hour breach-notification capability.
   Penalties reach ₹250 crore (Section 8(5), security safeguards) and ₹200 crore (Section 8(6),
   breach notification).
4. **AI auto-apply and AI resume-tailoring are the biggest liability surface — if/when built.**
   Fabricated experience in a tailored resume is misrepresentation; an autonomous agent spamming
   applications can damage a user's reputation and get the platform blocked by job boards; prompt
   injection from external job postings is OWASP's #1 LLM risk (OWASP Top 10 for LLM Applications
   2025, "LLM01: Prompt Injection," ranked #1, explicitly "unclear if there are fool-proof methods
   of prevention"). These need human-in-the-loop gates, audit trails, and hard rate limits before
   going autonomous. **As of this pass, arena-api has no live LLM/AI integration at all** — the
   product's "agent" is a deterministic scoring/matching engine plus templated notification copy,
   not an autonomous process. See DECISIONS.md for how this changes the guardrail scope.
5. **Multi-tenant IDOR/cross-tenant leakage is the most likely security incident.** Broken access
   control is OWASP's #1 web risk; a missing tenant filter is functionally an IDOR. PostgreSQL
   Row-Level Security as a database-level backstop, plus explicit 403-vs-200 authorization tests,
   are launch-blocking for a platform selling contact-unlock data.

## Details

### 1. Security

**Authentication & authorization (LAUNCH-BLOCKING):**
- Short-lived access tokens (~15 min) + rotating refresh tokens with reuse detection (IETF RFC
  9700 / BCP 240, §2.2.2: refresh tokens for public clients MUST be sender-constrained or use
  rotation). Store refresh tokens in HttpOnly, Secure, SameSite cookies — never localStorage.
- Sign with asymmetric keys (RS256/ES256) + JWKS/`kid` for rotation where practical; validate
  `iss`, `aud`, `exp`, `nbf`, `iat`, `jti`. Maintain a server-side `jti` denylist (Redis with TTL)
  for instant revocation on logout/compromise.
- **2FA (TOTP) mandatory for platform_admin and company_admin** before launch — these roles see
  cross-tenant and PII data. 2FA for regular users is a fast-follow.
- Strong password hashing (bcrypt/argon2); account lockout/backoff on the login endpoint.

**Multi-tenant isolation (LAUNCH-BLOCKING):**
- Add PostgreSQL Row-Level Security as a backstop using a per-request `app.current_tenant` GUC,
  so a forgotten `WHERE tenant_id=?` returns nothing instead of everything. Use a non-owner DB
  role for app queries (owners bypass RLS); a separate owner role only for migrations.
- Write explicit automated tests that assert **403 (not 200)** when user A requests user B's /
  tenant B's objects by ID across every sensitive endpoint (unlock records, resumes, messages,
  bids, interviews).
- Propagate tenant context through async/background jobs and scope all cache keys by tenant.

**OWASP Top 10 / input handling (LAUNCH-BLOCKING):**
- Parameterized queries/JPA everywhere (no string-concatenated SQL); Bean Validation on all DTOs;
  output-encode to stop stored XSS in messaging, bios, and job descriptions.
- CSRF: for cookie-based auth apply CSRF tokens; for pure Bearer-token APIs document the stateless
  model. Set security headers (CSP, HSTS, X-Content-Type-Options: nosniff, X-Frame-Options).

**Secure resume/file upload (LAUNCH-BLOCKING):**
- Allowlist file types and validate by magic bytes, not extension or client MIME; enforce
  server-side size limits; generate UUID filenames; store outside web root; serve via signed,
  expiring URLs; set `Content-Disposition: attachment` + `nosniff`.
- Malware-scan uploads (ClamAV or a scanning API) before the file is accessible to recruiters —
  validation alone does not catch a malicious PDF/DOCX; block macros in DOCX; strip EXIF from
  images.

**Rate limiting / abuse (LAUNCH-BLOCKING for auth + unlock + agent; fast-follow elsewhere):**
- Bucket4j token buckets (Redis for multi-instance) keyed by user ID/API key, returning 429 with
  `Retry-After`. Tight limits on login, password reset, resume upload, contact-unlock, messaging,
  and every AI-agent action.

**Secrets management (LAUNCH-BLOCKING):**
- Rotate every credential that ever touched dev/localhost before launch (JWT signing key, DB,
  Cloudinary, Resend, Razorpay, LLM keys). Move all to env vars/secrets; never commit `.env`.
  Separate keys per environment.

**Penetration testing (FAST-FOLLOW, human-only):**
- Run OWASP ZAP baseline + a focused manual test of IDOR, file upload, and auth flows pre-launch;
  commission a third-party pentest within the first quarter of taking money.

### 2. Data Privacy & Compliance — India (DPDP) + GDPR

**DPDP Act 2023 / DPDP Rules 2025 (build now; core items LAUNCH-BLOCKING):**
- Rules notified 13 Nov 2025; three-phase rollout — Board effective 13 Nov 2025; Consent Manager
  registration opens 13 Nov 2026; substantive obligations enforceable 13 May 2027. Treat 13 May
  2027 as the firm deadline but implement consent + breach readiness now.
- **Consent & notice:** plain-language notice before collecting data stating what's collected, the
  purpose, how to exercise rights, how to complain to the Board; consent must be free, specific,
  informed, unconditional, unambiguous, and per-purpose (no bundling "search me" into general
  T&Cs).
- **Candidate "consent to be searched" and withdrawal:** withdrawal must be as easy as giving
  consent (one tap). On withdrawal, stop processing immediately and remove the candidate from
  enterprise search results.
- **Data-principal rights:** access, correction, erasure, grievance redressal, nomination — fulfil
  within 30 days (consent withdrawal actioned immediately). Self-service rights portal + published
  Grievance Officer contact.
- **Retention & erasure:** erase when the purpose is served / consent withdrawn / on inactivity;
  maintain consent audit logs with timestamp + version.
- **Breach notification:** capability to notify the Data Protection Board within 72 hours and
  affected data principals; note the separate CERT-In 6-hour cyber-incident reporting obligation
  can be triggered by the same event. Penalties reach ₹250 crore (§8(5)) and ₹200 crore (§8(6)).
- **DPAs with enterprise customers:** Arena is the Data Fiduciary and cannot outsource liability;
  sign data-processing agreements with enterprise clients and processors (Cloudinary, Resend, LLM
  provider once one exists).

**Privacy policy / ToS / cookies (LAUNCH-BLOCKING for staging: mechanism + placeholder copy;
lawyer-reviewed final copy is a human launch-gate item, not this run's job):**
- Publish a DPDP-aligned privacy policy, terms of service, acceptable-use policy, and a granular
  cookie-consent banner with a reject option.

**GDPR + EU AI Act (fast-follow; launch-blocking only if EU users are knowingly onboarded):**
- Not in scope for this run — Arena has no EU users today.

### 3. Payments & Billing — India

**Everything in this section is explicitly OUT OF SCOPE for staging** — marketplace-money
(milestone/escrow) and Razorpay integration stay mocked/off. GST registration and Razorpay
merchant KYC are launch-gate items, not staging items. Do not touch this section this run.

### 4. Infrastructure & Reliability

- **Railway suitability:** fine for staging/soft-launch; harden with automated external `pg_dump`
  backups + tested restore, uptime monitoring, staging/prod separation. Before real money, migrate
  the DB to a platform with managed PITR — not required for this run.
- Automated daily DB backups **and a tested restore drill** (an untested backup is not a backup).
- Separate staging and production environments with separate secrets and databases.
- Error tracking (Sentry) frontend + backend; uptime monitoring with alerting.
- Safe production DB migrations (Flyway, backward-compatible, never destructive without backup).
- Health-check endpoints excluded from rate limits; TLS/HTTPS enforced; custom domain with
  auto-SSL if provided; graceful degradation for third-party outages (timeouts, retries, backoff,
  circuit breakers).

### 5. Performance & Cost

- LLM cost control is N/A today (no live LLM integration) — revisit when one is built.
- Pagination on every list endpoint; index `tenant_id` + FK/filter columns; eliminate N+1 queries;
  Redis caching for hot reads; connection pooling.

### 6. Quality & Testing

- Launch-blocking: integration tests on auth, tenant isolation (403 checks), consent/withdrawal
  flows. E2E happy-path via Playwright for critical journeys.
- Recognize a "Playwright-verified happy path" is not QA — add negative tests, permission tests.
- Accessibility (WCAG 2.2 AA) — fast-follow, legally relevant for hiring platforms.

### 7. Legal & Business

- AI auto-apply/resume-tailoring guardrails: N/A today (no live agent) — see Key Finding 4.
- ToS/Privacy/AUP published; content-moderation process for job posts (already exists — PA4
  moderation queue).

### 8. AI-Agent-Specific Production Concerns

**N/A for this run** — no live LLM/agent integration exists in arena-api. If/when one is built,
apply: human-in-the-loop for irreversible actions, prompt-injection segregation, anti-spam rate
limits, hallucination grounding, immutable audit trails, per-user cost budgets. Documented here so
the requirement isn't lost, not actioned this pass.

### 9. Launch & Go-to-Market Readiness

Out of scope for a staging run — cold-start/GTM strategy is a human/product decision, not an
engineering task.

## Stage 0 — Minimal Safe Launch (staging equivalent — this run's actual scope)

1. Rotate all secrets from dev; move to Railway env vars; separate staging/prod.
2. JWT hardening: short access + rotating refresh in HttpOnly cookies, revocation store, 2FA for
   admins.
3. Multi-tenant RLS + automated 403/IDOR tests across all sensitive endpoints.
4. Secure resume upload (magic-byte validation, malware scan best-effort, signed URLs) + input
   validation + security headers.
5. Rate limiting on auth, upload, unlock, messaging, and agent-labeled actions; token-aware budget
   caps deferred (no live LLM yet).
6. DPDP consent mechanism + plain-language notice + one-tap withdrawal + privacy policy/ToS/
   AUP/cookie banner + consent audit log + 72-hour breach process stub.
7. Automated DB backups + a tested restore; Sentry + uptime monitoring; TLS + custom domain;
   migrations via Flyway.
8. Integration + E2E tests on the critical paths; empty-state UX; support + feedback channels.

## Stage 2 gate — before enabling marketplace money + agent autopilot (NOT this run)

Confirm Razorpay Route eligibility, implement escrow via the PA, GST TCS/GSTR-8 filing, refund/
dispute flows. Build a real LLM agent with the Section 8 guardrails only after that. None of this
is attempted in the staging run — see the LAUNCH GATE in ARENA-SHIP-IT.md.
