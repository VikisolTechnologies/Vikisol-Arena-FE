# Inbox: backend cloud session (Vikisol-Arena-BE), from the architect
**Where this lives:** the Vikisol-Arena-FE repo, branch `feature/arena-vnext-mobile-jenny`, `docs/missions/INBOX-BACKEND.md`.

**Rule:** when the founder says "check your inbox", `git fetch` the FE repo, read this file, do every OPEN mission, and report. You cannot push to the FE repo, so put your status in your PR descriptions and your reply.

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
