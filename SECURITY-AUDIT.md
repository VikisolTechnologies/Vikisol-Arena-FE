# SECURITY-AUDIT.md — ARENA-DEEP-AUDIT.md Phase 5

Methodology: live testing against the **deployed** app (`arena.vikisol.in` / `api-arena.vikisol.in`)
via curl/Playwright, plus source review for anything a black-box test can't observe directly
(service-layer ownership checks, annotation coverage, dependency versions). Every finding below
was independently verified, not assumed from a tool's raw output — several were caught, chased
down, and either fixed or ruled out as non-issues below.

---

## Findings, most severe first

### 1. Production site was sending `noindex, nofollow` to every search engine — FIXED

**Severity: High (business-impact, not data-security).** `curl -sI https://arena.vikisol.in/`
showed `x-robots-tag: noindex, nofollow` on every response. Root cause: `next.config.ts` set
this unconditionally, written per `ARENA-SHIP-IT.md #8`'s "keep staging PRIVATE" requirement
alongside the `middleware.ts` Basic Auth gate. The gate correctly went dormant when
`STAGING_BASIC_AUTH` is unset (i.e. in production - confirmed already correct), but the noindex
header was never made conditional the same way, so it kept shipping after the domain cutover to
production. **Google has not been able to index this site at all since it went live.**

Fixed: moved the header into `middleware.ts`, gated behind the same `STAGING_BASIC_AUTH` check
as the access gate, so it only applies to an actual staging deploy. Verified live post-deploy:
`curl -sI https://arena.vikisol.in/` no longer returns the header. Commit `bef5bac`.

### 2. arena-web was sending zero security response headers — FIXED (partial)

**Severity: Medium.** `api-arena.vikisol.in` (Spring Security defaults) already sends CSP, HSTS,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`. `arena.vikisol.in` — self-hosted on
Railway via its own Docker image, not a platform like Vercel that injects sane defaults — was
sending none of them.

Fixed: added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` globally via
`next.config.ts`. Verified via build + lint, deployed. Commit `42daf3b`.

**Deliberately not done**: a `Content-Security-Policy` for arena-web. Getting one right requires
enumerating every legitimate script/connect/style origin this app actually uses (Sentry ingest,
`api-arena.vikisol.in`, GSAP, the R3F/WebGL orb scenes, self-hosted fonts) and testing every page
against it — a wrong CSP could silently break the 3D scenes, which this project's ground rules
require staying intact. **Recommended follow-up**: build a CSP in report-only mode first, verify
zero violations across a full route sweep, then switch to enforcing.

### 3. Backend dependency (Spring Framework 6.1.8, via Spring Boot 3.3.0) has a real CVE — documented, not fixed this pass

**Severity: informational (confirmed non-exploitable in this codebase).** CVE-2025-41249 (CVSS
7.5, CWE-285 Improper Authorization): Spring's annotation-detection can fail to resolve
`@PreAuthorize`/method-security annotations on methods within type hierarchies with a
parameterized supertype using unbounded generics — meaning a protected method can silently become
unprotected under that specific pattern. Spring Boot 3.3.0's managed Spring Framework version
(6.1.8) falls in the affected range (6.1.0–6.1.22).

**Checked applicability directly**: `grep -rn "^public class \w*<" src/main/java/` returns zero
matches — there are no generic-parameterized classes anywhere in arena-api, let alone one
carrying `@PreAuthorize`. The vulnerable *pattern* does not exist in this codebase, even though
the vulnerable *dependency version* does. Real exploitability here is effectively nil.

**Not fixed this pass**: Spring Boot 3.3.x is now fully end-of-life — there is no safe same-line
patch release to bump to. A real fix means crossing multiple minor versions (3.3 → 3.4 → 3.5+),
which is genuine regression-testing work across the whole backend, not a same-session drop-in
change to a live production API. Rushing an untested framework migration mid-audit would risk
regressing correctness for a vulnerability that's already confirmed non-exploitable here.
**Recommended follow-up**: a dedicated, separately-tested Spring Boot upgrade pass.

### 4. Frontend dependency vulnerabilities — 2 of 4 fixed, 2 documented as non-exploitable

`npm audit` found 4 packages: `hono` (moderate) and `nanoid` (high) resolved cleanly via
`npm audit fix` (transitive deps of `shadcn` CLI and `postcss`/`@tailwindcss/postcss` — dev
tooling only, never shipped to the client bundle). Commit `f40368a`.

`postcss` and `sharp` (both high) require bumping Next.js to `16.3.0`, which npm flags as
**outside the stated dependency range** — not a safe patch bump. Checked real exposure: `sharp`
only matters via `next/image`, and `grep -rn "next/image\|<Image" src/` returns zero matches —
this app never uses it. `postcss`'s CVEs (XSS via unescaped `</style>`, path traversal via
`sourceMappingURL`) require processing attacker-controlled CSS/source-map input; postcss here
only ever processes the app's own build-time source CSS. Zero real attack surface for either.
Documented as a known dependency-version gap, not force-upgraded.

### 5. Minor: `GET /applications/{id}` returns 500 instead of 404

**Severity: Low (not a security finding — confirmed not an IDOR).** No such route exists in
`ApplicationController` (only `GET /applications` list and `GET /applications/exists`); the
frontend fetches the list and filters client-side (`getApplicationById` in
`lib/api/applications.ts`) rather than calling a per-ID endpoint. Live-tested this path anyway as
part of the IDOR sweep: it returns `500 {"success":false,"message":"Something went wrong..."}`
for **both** the legitimate application owner and an unrelated candidate — identical behavior,
so nothing is being leaked or distinguished between authorized/unauthorized callers. The 500
(rather than a 404) suggests `GlobalExceptionHandler` may be catching a framework-level
"no route matched" exception and converting it to a generic 500. Worth a follow-up fix for
correctness/API cleanliness, not urgent, not a security issue. Reassuringly, the error body leaks
no stack trace, exception class, or internal path — confirms `GlobalExceptionHandler` correctly
sanitizes 500s before they reach the client.

---

## Checks that passed clean (re-verified, not assumed)

- **IDOR / cross-tenant leakage** — re-ran `scripts/idor-check.sh` against the live deployed API:
  **9/9 passed.** Cross-tenant reads of another tenant's postings/applicants correctly 403;
  same-tenant reads correctly 200; non-platform-admin blocked from `/admin/tenants`; unsigned
  file URLs correctly 403.
- **Candidate-side IDOR (extended coverage beyond the existing script)** — signed in as two
  distinct talent accounts, live-tested cross-candidate access to another candidate's application:
  `DELETE /applications/{id}` (withdraw) correctly 403s for a non-owner. The interview-by-application
  read returns an identical response for owner and non-owner alike when no interview exists yet
  (not a leak — both get the same "nothing to see" response, consistent with the existing script's
  own documented caveat about this endpoint).
- **Message/conversation ownership** — `ConversationService.getMessages`/`sendMessage` call
  `assertParticipant(userId, conversation)` before returning anything, even though
  `MessageController` carries no `@PreAuthorize` — ownership is correctly enforced at the service
  layer instead of the annotation layer. Confirmed by reading the actual service code, not just
  counting annotations on the controller.
- **Global authorization posture** — `SecurityConfig` uses `anyRequest().authenticated()` as the
  default, with a short, deliberately narrow, explicitly-enumerated allowlist for genuinely public
  endpoints (signup/signin/refresh/signout/2FA-verify/invitation-accept, invitation-view-by-token,
  actuator health, swagger docs, signed-URL file GETs). Default-deny, not default-permit — the
  correct posture.
- **Rate limiting** — live-verified, not just read in code: 13 rapid login attempts against
  production correctly returned `401` for the first 10, then `429` for the rest. Confirms the
  10/minute auth bucket is actually enforced at runtime, not just configured.
- **CORS** — a preflight `OPTIONS` request from an arbitrary untrusted origin
  (`evil-attacker.example.com`) correctly returned `403`; the same request from the app's real
  origin (`arena.vikisol.in`) correctly returned `access-control-allow-origin` scoped to that
  exact origin with credentials allowed. Not a wildcard/reflected-origin misconfiguration.
- **Unauthenticated access** — `GET /jobs` without a token correctly returns `401`, not a data
  leak to anonymous callers.
- **Upload validation** — read `LocalDiskFileStorageService` directly: extension allowlist
  (`.pdf/.doc/.docx` + common image types), a 10MB size cap redundant with Spring's own
  `multipart.max-file-size` config, **magic-byte content fingerprinting** (defeats the classic
  "rename malware.exe to resume.pdf" bypass — an extension check alone wouldn't catch this),
  path-sanitized storage folders, and UUID-based stored filenames (the original filename never
  reaches the filesystem path). Solid, layered validation.
- **Bundle secrets scan** — grepped frontend source for hardcoded API keys/secrets/tokens
  (`sk_live_`, `AKIA...`, private-key blocks, etc.) and hardcoded password/secret literal
  assignments: clean. All `NEXT_PUBLIC_*` vars in use (`API_MODE`, `API_URL`, `API_BASE_URL`,
  Sentry DSN/environment/sample-rate) are safe-by-design to expose client-side.
- **Error responses don't leak internals** — the 500 in finding #5 above, and every other error
  response checked this pass, return a generic, user-facing message with no stack trace, package
  name, or file path — confirms `GlobalExceptionHandler` is doing its job.

## Known limitation, re-confirmed (not new)

Local-disk file storage (`LocalDiskFileStorageService`) is not durable across redeploys/container
restarts on Railway's ephemeral filesystem — every uploaded resume/profile image is lost on the
next deploy. This was already known and explicitly communicated to the founder before the earlier
decision to remove the staging access gate (see prior session's `DECISIONS.md`/`BLOCKED.md`
context). Re-confirmed via code review this pass, not a new finding — flagging again here only
because Phase 5's upload-validation check surfaced it directly.

## Not covered this pass (explicit scope boundary)

- No penetration test against arena-api's business logic beyond the checks above (e.g., race
  conditions on bid placement, payment/escrow flows — Razorpay integration is still a documented
  pre-existing gap per `GAPS.md`, not a live payment surface to test).
- CSP for arena-web (see finding #2) — needs its own dedicated pass with report-only verification
  across every route before enforcing.
- Spring Boot version upgrade (see finding #3) — needs its own dedicated, separately-tested pass.
