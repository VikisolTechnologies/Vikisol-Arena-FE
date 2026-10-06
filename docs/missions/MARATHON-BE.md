# MARATHON, backend (2 Oct 2026): run unattended to release-ready
**From the architect. The founder is away for about 5 hours and will not answer.** Work alone until every step is done or truly blocked.

## Standing orders
- **Never stop to ask a question.** Decide, note the decision in the report, and move on.
- **Working folder:** only `/Users/jenniferisrael/Developer/Vikisol-Arena-BE` (branch `feature/admin-account-gaps`).
  - In `../arena-fe-vnext/docs/missions/` you may edit only `API-ISSUES.md` (status lines) and `REPORTS-BE.md` (your reports; a new file, so you don't collide with the frontend's `REPORTS.md`).
  - Don't commit in the frontend repo; the frontend builder commits those files.
- **Git:**
  - One commit per item, with a test.
  - Try `git push` once after each commit. If it fails (network), carry on and push later.
  - **Never** merge to or push `main`. Never force-push.
- **The running local server (`localhost:8081`) belongs to the frontend's testing.**
  - Run your tests on the embedded Postgres only.
  - **Never reset the local database.**
  - Restart the running server **only** after you fix an `API-ISSUES.md` entry, so the frontend gets the fix (`SEED_ENABLED=false`, `SPRING_PROFILES_ACTIVE=local`). Keep downtime under a minute, and note the restart time in `REPORTS-BE.md`.
- **Never loosen a test.** The full suite must be green before each push.
- **No secrets** in code, logs or docs.
- **Never touch production, Railway or any HRLMS / Vikisol One resource.**

## Loop: between every item below
Re-read `../arena-fe-vnext/docs/missions/API-ISSUES.md`. Any **OPEN** entry comes first:
- verify it against your controllers;
- fix it with a test, or answer "FE path error: use <path>";
- mark it `FIXED <commit>` or `ANSWERED`;
- restart the local server if code changed.

**Also read `QA-BUGS.md`** in the same folder: fix the OPEN bugs whose owner is BE, the same way.

## Step 1: B11, pre-launch hardening (all 17 items in `INBOX-BACKEND.md`, in that order)
Do the items a frontend journey depends on first: withdrawn applications, people search (banned and blocked users), the `GET /needs/{id}` audience filter, the waitlist, the check-in race, NO_SHOW `outcomeRecordedAt`, and DOB required for write actions (item 17).

## Step 2: DataSeeder
- `DataSeeder` must respect `SEED_ENABLED` on **every** start: default **false**, and it never seeds when the flag is false.
- It must tag everything it creates `demo_content=true`.
- Add a startup guard: if the profile is production-like (not `local`) and `SEED_ENABLED=true`, **fail startup** with a clear message.
- Tests for all three.

## Step 3: production-safety self-check
Write `docs/DEPLOY-CHECKLIST.md` in the backend repo:
- **The exact Railway env var names** this branch needs (names only): DB, Redis, JWT, Cloudinary, mail, JennySol gateway, CORS origins including `https://arena.vikisol.in`, `SEED_ENABLED=false`, platform admin bootstrap.
- **Memory:** 1 GB.
- **Migrations V21–V44:** what each one does to existing data, and which are safe to re-run.
- **The two pre-deploy SQL checks** (flyway history; distinct industries) and what result is safe.
- **How to roll back.**
- **A startup validation:** fail fast with a clear message when a required variable is missing in a non-local profile.

## Step 4: merge readiness
- Make sure PR #2, #3 and #4 are up to date and green.
- In `REPORTS-BE.md`, give the exact merge sequence and the retarget steps for the founder (#2 → `main`; retarget #3 → `main`, merge; retarget #4 → `main`, merge).
- **Do not merge.**

## Step 5: final report
At the top of `REPORTS-BE.md`: **"BE RELEASE CANDIDATE READY"**, with the final test count and every B11 item listed as fixed (with commit) or deferred (with reason). If it isn't ready, say exactly what's left.
