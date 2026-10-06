# MARATHON-BE-2 (3 Oct 2026): push and support the frontend
**From the architect.** The MARATHON-BE standing orders still apply: never ask; never merge to `main`; never reset the local database; never loosen a test; **never touch production or Railway**.

## Step 1: push
Run `git push` for the 18 local commits on `feature/admin-account-gaps`. If the network is down, retry once after each later step.

## Step 1b: architect review of the marathon commits (3 Oct). Fix these first
The marathon is accepted (292 tests; the unlock-credits finding was excellent). There is one BLOCKER, plus should-fix items.

1. **BLOCKER: the notification name scrub corrupts other people's data.** `PersonalDataService.erase` does `replace(body, :name, 'Deleted user') … like '%name%'` over every other user's notifications.
   - Someone named "Ravi" or "An" deletes their account, and every notification containing that substring is rewritten ("Ravi Kumar joined" becomes "Deleted user Kumar joined"). It's also a full-table scan inside the erase transaction.
   - **Fix it properly:** a migration (V45) adds a nullable `actor_user_id` to `arena_notifications`. `NotificationService` sets it at every call site that names a person. On erase, scrub only the rows `where actor_user_id = :u`.
   - Old rows with a null actor are left alone.
   - Test with two users whose names overlap.
2. **Withdrawn application by id** (`ApplicantService.getApplicant`): the company still gets the full CV and profile through the detail URL.
   - Return a stage-only stub for WITHDRAWN: no CV, no profile fields, no CTC.
   - Update the existing test to assert the stub. That's the intended behaviour, not loosening.
3. **The local-upload endpoint:**
   - add `@Profile("local")` on the controller method or bean;
   - require an authenticated user;
   - check the signature timestamp expiry;
   - **remove the advice to "set SPRING_PROFILES_ACTIVE=local" from the `FileSigningSecretGuard` and `DataSeeder` error messages.** Nobody should be told to switch a deployed service to the local profile.
4. **`DataSeeder`:** call `entityManager.flush()` before `DemoSeedingContext.end()`, so cascade-persisted children are tagged.
5. **Force sign-out, strictly-after rule:** any flow that revokes sessions and then issues a fresh token in the same request (password change, "sign out other devices") must still work. Add a test; fix it if it fails.
6. **DOB required for writes:** confirm with a test that an email-signed-up **company** account (the DOB is collected at sign-up) can send a connect request and a message. Also confirm the error for an account without a DOB is a clean 400 with a stable code (`DOB_REQUIRED`) that the frontend can detect.

## Step 2: restart the local server on the latest code
The frontend must test against the B11 behaviour. `SEED_ENABLED=false`, `SPRING_PROFILES_ACTIVE=local`. Don't reset the database.

## Step 3: when the network is back
Add `com.google.guava:guava`, and swap the curated public-suffix set for `InternetDomainName` (B11 item 15 follow-up). Add a test.

## Step 4: support loop, for as long as the frontend is working
Every 10 minutes, re-read `API-ISSUES.md` and `QA-BUGS.md` (in `../arena-fe-vnext/docs/missions/`).
- Fix or answer the OPEN entries owned by BE (with a test, a commit and a push).
- Restart the local server after each fix.
- Mark the entry `FIXED <commit>`.
- Stop when `REPORTS.md` shows "FE RELEASE CANDIDATE READY", or after 6 hours.

## Step 5: report
At the top of `REPORTS-BE.md`: the push status and the issues fixed.
