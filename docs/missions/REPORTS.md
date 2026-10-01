# Mission reports (newest first)
Builders append their final report for each mission here. The architect reads it directly.

## Mission B9 — 1 Oct 2026
**Backend repo, pushed to `feature/admin-account-gaps`** (commit `7469cab`, README only — no app
code changed, nothing merged to `main`).

**1. Running locally.** No Docker on the Mac, so used Homebrew: `postgresql@16` (role `postgres`,
password `Welcome@12345#` — matches the app's existing default, no code change needed) and
`redis` (default `redis://localhost:6379`, no auth). Created `vikisol_arena` and booted with
`SEED_ENABLED=false PLATFORM_ADMIN_EMAIL=... PLATFORM_ADMIN_PASSWORD=... ./mvnw spring-boot:run`.
Confirmed:
- All 44 Flyway migrations applied clean (log: "Successfully applied 44 migrations... now at
  version v44") — V38–V44 included.
- `GET /api/v1/actuator/health` → `{"status":"UP"}`.
- `POST /api/v1/auth/signin` with the bootstrap admin → `200`, real JWT, role `platform_admin`.
- `OPTIONS /api/v1/auth/signin` with `Origin: http://localhost:3001` → CORS allowed (and
  `:3000` is in the same default `CORS_ORIGINS` list) — no code change needed for M6.
- Left the server running locally (PID backgrounded) so the frontend can call
  `http://localhost:8081/api/v1` right away.
Wrote the exact start command and a one-line DB-reset command (`dropdb && createdb`, Flyway
rebuilds on next boot) into the backend `README.md`, replacing the stale Windows/Docker
instructions.

**2. First platform admin.** Already existed and didn't need building: `DemoAccountLockdown`
(an `ApplicationRunner`, `seed/DemoAccountLockdown.java:150-178`) creates exactly one platform
admin from `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` on first boot if neither is blank,
refuses the retired demo address, and never logs the password — confirmed by reading it and by
the live run above ("Created a platform admin account from the environment" — no password in
the log line). Documented this as the one-time local setup in the README rather than writing a
new bootstrap path, since one already exists and fits the brief. 2FA (`ADMIN_2FA_REQUIRED=true`)
is still required on first sign-in, unchanged.

**3. API-ISSUES.md.** Checked `docs/missions/API-ISSUES.md` — it's still just the template header,
no entries yet. Nothing to fix. Will pick this back up once the frontend starts filing real
mismatches against the local backend.

**4. Railway deploy readiness** (not deployed — documented only, in the README's new "Railway
deploy readiness" section): env var names (`DB_URL`/`DB_*`, `REDIS_URL`, `JWT_SECRET`,
`JWT_REQUIRE_REAL_SECRET=true`, `FILE_SIGNING_SECRET`, `PLATFORM_ADMIN_EMAIL`/`_PASSWORD`,
`SEED_ENABLED=false`, `CORS_ORIGINS`, `FRONTEND_URL`, plus the still-blank JennySol/Resend vars);
1 GB memory (Dockerfile's `JAVA_OPTS` already sizes the heap off the container, no change needed —
just confirm the Railway plan); V38–V44 auto-run on boot via Flyway, same as local; and
`https://preview-arena.vikisol.in` needs adding to `CORS_ORIGINS` as a Railway env var (not in
the default localhost-only list).

**B8 (backend moves to Claude Code on the Mac):** on `feature/admin-account-gaps`
(up to date with origin, `local/wip-2026-09-29` untouched). `./mvnw test` (embedded Postgres):
**252/253 pass in the full run** — one failure, `AdminAccountGapsTest.launchMetricsCountRealActivityOnly`
(expected `signUps=2`, got `5`). Ran that test class alone and it's clean (10/10). This is
cross-test pollution from shared embedded-Postgres state across the full suite, not a broken
assertion or a loosened test — didn't touch the test. Flagging for the architect rather than
"fixing" by weakening the assertion.

**Rules followed:** nothing merged to `main`; no test loosened; no password committed, logged, or
pasted into this report — both local admin credentials were typed directly into the shell.

---

