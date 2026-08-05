# DECISIONS.md — architecture calls made without stopping to ask

Per the mission's standing rule: decisions get logged here instead of interrupting the
user. Each entry says what was decided, why, and what it costs/defers.

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
