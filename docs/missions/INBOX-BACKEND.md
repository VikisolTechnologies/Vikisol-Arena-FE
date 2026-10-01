# Inbox: backend cloud session (Vikisol-Arena-BE), from the architect
**Where this lives:** the Vikisol-Arena-FE repo, branch `feature/arena-vnext-mobile-jenny`, `docs/missions/INBOX-BACKEND.md`.

**Rule:** when the founder says "check your inbox", `git fetch` the FE repo, read this file, do every OPEN mission, and report. You cannot push to the FE repo, so put your status in your PR descriptions and your reply.


**Reporting (new, 1 Oct):** when you finish a mission, also write your full final report into `docs/missions/REPORTS.md`: newest first, headed `## <Mission> — <date>`. Commit and push it. The architect reads it straight from the Mac, so the founder no longer needs to paste replies.



## Token discipline (founder, 1 Oct 2026)
- **Start each mission in a fresh session** (`/clear`). This inbox carries the context; don't re-read the whole repo or all the docs.
- Read only the files the current area needs. Use `grep` rather than opening big files whole.
- Run **targeted tests** while working. Run the full suite **once per area**, before you report.
- **No screenshots** unless the architect asks for them.
- Keep chat replies to 5 lines or fewer. The full report goes in `REPORTS.md`.
- If you're stuck after two attempts, write the problem in the report and move on; don't loop.

## Release rule (founder, 1 Oct 2026)
- **Production:**
  - frontend `arena.vikisol.in` deploys **only from `main`**;
  - backend `api-arena.vikisol.in` deploys only from BE `main`.
- **Feature branches never deploy to production.** A push to a feature branch only gives a Vercel preview URL.
- **A production release is a milestone merge to `main`:**
  - the architect reviews it and says "release-ready";
  - the founder gives the OK;
  - the founder (or a builder, on his explicit instruction) merges;
  - the backend goes first, then the frontend.
- The frontend production build requires `NEXT_PUBLIC_ARENA_DATA=api`, so no dummy data can go live.
- Builders never merge to `main` on their own.

---

## Mission B7 (DONE, 1 Oct 2026, by the cloud session)
Result: every row from 48 to 62 is built across PR #2, #3 and #4. PR-P0 was already merged to main as PR #1. JAVA_OPTS, the 60/min read limit, trigram and CORS max-age are all done. Rows 42–47 stay in JennySol.

<details><summary>Original B7 text</summary>

1. **Gap rows:** read the canonical list in `docs/FE-API-GAPS.md` on FE branch **`feature/arena-vnext-mobile-jenny`** (rows 42–62; rows 55–62 are there).
   - Your "highest row 54" came from an older or Cursor branch.
   - **Match rows by endpoint, not by number.**
   - Give a table: row → endpoint → built in which PR / not built. Then build every row that isn't built yet, especially:
     - 55 `GET /admin/team`;
     - 57 `GET/PUT /admin/users/{id}`, suspend/restore, force sign-out;
     - 58 `GET/PUT /notifications/preferences`;
     - 59 `PATCH /profile/me`;
     - 60 profile visibility honoured on `GET /profile/{id}`.
   - Skip anything that your row 50 warn/suspend/ban already covers, and say so.
2. **PR-P0** (demo-password fix, `fix/p0-security-honesty`):
   - confirm it is its **own PR, based on `main`**, and give its number;
   - it merges first.
3. **Merge order:** list every open PR with its base branch, in merge order (P0 → #2 → #3 → #4?).
   - If they are stacked, say which base each one retargets to after the one below merges.
4. **Confirm the status** of each, with file and line or the PR:
   - `JAVA_OPTS` in the Dockerfile (container-aware memory, 1 GB service);
   - the message read limit of 60/min;
   - the trigram search index.
5. **Rules:**
   - nothing merges to `main`;
   - never loosen a test;
   - no secrets in code, logs or PR text;
   - no scheduled check-ins.

</details>

---

## Mission B8 (OPEN, 1 Oct 2026): backend moves to Claude Code on the Mac (the cloud session is retired)
1. In `~/Developer/Vikisol-Arena-BE`, run `git fetch` over the hotspot or WARP, then `git checkout feature/admin-account-gaps && git pull`. Do not touch the `local/wip-2026-09-29` branch.
2. Run `./mvnw test` and confirm 253 tests pass locally, using the embedded Postgres. Report the result.
3. Then **stop and wait**. The architect is reviewing PR #2 → #3 → #4 and will write the fixes here as B9.
4. The rules are unchanged:
   - nothing merges to `main`;
   - never loosen a test;
   - no secrets;
   - push after every commit.

---

## Mission B9 (OPEN, 1 Oct 2026, TOP PRIORITY): run the real backend for the frontend integration
The founder wants a working prototype on real data. The frontend (M6) will call this backend running locally on the Mac.
1. **Run locally.** Get `feature/admin-account-gaps` running on `http://localhost:8081/api/v1` with a local Postgres and Redis (Docker Compose, or Homebrew if Docker isn't installed).
   - `SEED_ENABLED=false`: no demo data.
   - CORS allows `http://localhost:3001` and `http://localhost:3000`.
   - Write the exact start commands into the backend README: one command to start, one to reset the database.
2. **The first platform admin, locally.** Give a one-time CLI or bootstrap path that creates a platform admin from environment variables. The founder types the password himself; never commit or log it.
3. **API issues.** Watch `../arena-fe-vnext/docs/missions/API-ISSUES.md`.
   - Fix each mismatch on the backend, with a test, and push.
   - Mark the entry FIXED with the commit.
4. **Deploy readiness (don't deploy):** list exactly what Railway `arena-api` needs for this branch:
   - env vars (names only);
   - 1 GB memory;
   - migrations V38–V44 run automatically;
   - CORS origins for `preview-arena.vikisol.in`.

   The architect is reviewing PR #2 → #3 → #4 in parallel. After approval, the founder merges and Railway deploys.
5. **Report** in `../arena-fe-vnext/docs/missions/REPORTS.md` (newest first).

---

## Mission B10 (OPEN, 1 Oct 2026, TOP PRIORITY after B9 step 1): fix the release blockers
Read `docs/reviews/ARCHITECT-REVIEW-BE-1-2026-10-01.md` (in arena-fe-vnext).
1. Fix all **7 BLOCKERS**, one commit each with a test that would have caught it, on `feature/admin-account-gaps`.
2. Then the **migration items** under SHOULD-FIX (V40 and V44 safety, the industry converter check).
3. Then as many of the other SHOULD-FIX items as are quick. List any you defer, with the reason.
4. Never loosen an existing test. Push after each commit.
5. Report in `REPORTS.md`: one line per item (fixed in commit X / deferred because …) and the final test count.
6. Keep running B9 for the frontend in parallel: `API-ISSUES.md` entries come first when the frontend is blocked.

### Architect notes on B8/B9 (1 Oct): accepted
- **Add to B10:** the flaky `AdminAccountGapsTest.launchMetricsCountRealActivityOnly` (5 vs 2 in the full run) is a test-isolation bug.
  - Fix the isolation (clean state, or count relative to a baseline taken at test start).
  - Don't loosen the assertion.
  - The full suite must be 253/253 green.
- **Support the 18+ rule at sign-up:** if `POST /auth/signup` or onboarding can't take a date of birth or an 18+ confirmation, add it. The age rule must be enforced on the backend, not only in the UI.

### Architect notes on B10 (1 Oct): ACCEPTED
All 7 blockers are verified fixed. Thank you; that was clean work.

## Mission B11 (OPEN, after the frontend reports area 3): pre-launch hardening
Do these items from `ARCHITECT-REVIEW-BE-1` SHOULD-FIX, in this order, one commit and one test each:
1. **Withdrawn applications:** exclude them from company access (an "active application" query).
2. **People search:** exclude banned users, and blocks in both directions, at the query level.
3. **`GET /needs/{id}`:** audience, block and paused filter.
4. **Waitlist:** head-of-queue promotion, or refuse non-head `/join`.
5. **Check-in:** upsert on the race.
6. **NO_SHOW:** stamp `outcomeRecordedAt`.
7. **`ReminderService`:** `SKIP LOCKED`.
8. **`evidenceUrls`:** `@Size(4)` and Arena-only URLs.
9. **`autoFlag`:** run it on title edits too.
10. **The needs respond-loop:** rate-limit it.
11. **Force sign-out:** fix the same-second gap, and make it reach Jenny tokens.
12. **Audit-log CSV export:** audit it.
13. **`OutcomeView`:** drop "with whom".
14. **Notification actor names:** render them from the actor id, not text baked in.
15. **Public suffixes:** reject them in domain verification.
16. **Unlock credits:** atomic, with a race test.

**Before then:** keep serving `API-ISSUES.md`. Don't merge anything.
