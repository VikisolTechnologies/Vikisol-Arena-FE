# Architect review, backend 1: 1 Oct 2026
**Scope:** `main` → `feature/admin-account-gaps` (PR #2 + #3 + #4 combined): 291 main files, about 13k lines, and migrations V21–V44.
**Verdict:** not release-ready yet. There are 7 blockers. The quality is otherwise high: admin guards, audits, redacted provider logs, tenant isolation, CTC rules, protected-attribute filters and pagination all pass.

## BLOCKERS (fix before the first production release)
1. **Hidden profiles leak through nearby search.**
   - `SearchService` (~`if (near) { … } else if (visibility != EVERYONE)`) skips the visibility check whenever `near` is set.
   - The caller picks any point at a 0.5 km radius and gets back a distance, which lets them locate a person.
   - **Fix:**
     - always apply visibility;
     - anchor `near` to the caller's own stored area;
     - minimum radius 2 km;
     - return distance bands ("within 2 km"), not exact kilometres.
2. **Hidden, banned or blocked profiles are only hidden on `GET /profile/{id}`.** The same check is needed on:
   - `/needs/outcomes/{userId}`;
   - `/projects/of/{userId}`;
   - `/profile/{userId}/stats`;
   - `/posts/user/{userId}`;
   - `POST /profile/{id}/report`;
   - `ConnectService.send`.

   **Fix:** one shared `requireVisibleTo(viewer, target)` at the start of every per-person endpoint, returning 404 so the response doesn't confirm the person exists.
3. **Unlinked employers can message any talent.**
   - `MessagingPolicy.mayStartChat` returns `true` when the sender has no tenant, or when the recipient is missing.
   - **Fix:** return `false` in both cases.
4. **The pipeline allows any stage → any stage** (`ApplicationService.advanceStageAsEnterprise`).
   - A recruiter can revive a WITHDRAWN application (which brings back the CV and CTC visibility) or set APPLIED→HIRED, skipping the candidate's offer decision.
   - **Fix:** an allowed-transition map:
     - APPLIED→SCREENING→INTERVIEW→OFFER, and any open stage→REJECTED;
     - only `decideOffer` sets HIRED;
     - WITHDRAWN, REJECTED and HIRED are terminal for the company.
5. **An unverified company can reopen a job and put it live** (`JobPostingService.setStatus`).
   - CLOSED/PAUSED→OPEN skips `requirePublishAllowed`.
   - **Fix:** check it on every transition into OPEN.
6. **Admin erasure of a recruiter or hiring manager keeps their identity** (`PlatformUserService`).
   - The email, password hash, handle and phone stay, and `issueSession` checks only `isBlocked`.
   - **Fix:**
     - tombstone the email, phone, handle and password hash;
     - refuse `deletedAt` users in `issueSession` and on refresh;
     - audit by user id only (no "Name (email)" in the audit target).
7. **A real-looking DB password is the default in `application.yml`** (`${DB_PASSWORD:Welcome@12345#}`).
   - **Fix:** no default, so startup fails without the variable.
   - **Founder:** if that password was ever used on a real database, rotate it.

## SHOULD-FIX (same PR if quick, otherwise next)
**Migrations:**
- **V40:** schema-qualify `gin_trgm_ops` (`SET search_path`), and keep the index creation inside the exception handler.
- **V44:** add the foreign keys `NOT VALID`, then `VALIDATE CONSTRAINT`.
- **Before deploy:** run `SELECT DISTINCT industry` on production across the three tables; any value outside the five keys must be seeded first. Confirm that production's `flyway_schema_history` stops at V20.

**Activities:**
- **Waitlist:** promote the head of the queue when a spot frees (under the row lock), or refuse `/join` from non-head users while the queue is non-empty.
- **Check-in race:** upsert the attendance row (`ON CONFLICT (join_id)`) or lock the join row.
- **NO_SHOW** must stamp `outcomeRecordedAt`, or disputes always fail. Add a test.
- **`ReminderService.sendDue`:** use `FOR UPDATE SKIP LOCKED` (or ShedLock) so a second replica doesn't double-send.

**Access and privacy:**
- **Withdrawn applications:** exclude them from company access (talent search, the applicant list, "employers I apply to" fields). Use an "active application" query.
- **`GET /needs/{id}`:** apply the audience, block and paused filter, as post detail does.
- **`OutcomeView`:** drop `postId` and title for outcomes the person didn't author. It reveals "with whom".
- **Erasure:** stop baking the actor's name into notification text (render from the actor id), or scrub on erase.
- **People search:** exclude banned users and blocks in both directions.

**Abuse limits:**
- **Needs respond/withdraw loop:** rate-limit it, once per day per post after a withdraw.
- **`evidenceUrls`:** `@Size(max=4)`, and accept only Arena's own `/reports/evidence` URLs.
- **`PostService.update`:** run `autoFlag` on title changes too.

**Sessions and audit:**
- **Force sign-out, same second:** compare with `isAfter`, or store revokedAt + 1 s.
- **Force sign-out must also stop Jenny service tokens:** check `sessionsRevokedAt` in `AgentServiceTokenAuthenticationFilter`.
- **Audit-log CSV export:** audit it (`AUDIT_EXPORTED`).

**Business:**
- **Domain verification:** reject public suffixes (`co.in`, `github.io`) using Guava's `InternetDomainName`.
- **Unlock credits:** confirm an atomic decrement or a pessimistic lock, so two parallel unlocks can't overspend. Add a test.
- **`findByJobPosting(...).isEmpty()`:** replace with `existsByJobPostingId`.
- **Industry mapping:** confirm the `Industry` converter is `autoApply`, or set explicitly, on `EnterpriseProfile` and `JobPosting`, so old string rows read correctly. A test already exists if it round-trips; name it.

## Release path
B10 (the blockers plus the migration safety items) → architect re-check of only those diffs → founder OK → merge #2 → #3 → #4 to `main` → Railway deploys.
