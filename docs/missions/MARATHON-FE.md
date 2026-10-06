# MARATHON, frontend (2 Oct 2026): run unattended to release-ready
**From the architect. The founder is away for about 5 hours and will not answer.** Work alone until every step below is done or truly blocked.

## Standing orders
- **Never stop to ask a question.**
  - Decide using this file, `INBOX-CLAUDE-CODE.md` and `docs/design/ARENA-APP-FLOW.md`.
  - Write the decision in the report.
  - If something is truly blocked, log it in `API-ISSUES.md` or the report and **move to the next step**.
- **Working folder:** only `/Users/jenniferisrael/Developer/arena-fe-vnext` (branch `feature/arena-vnext-mobile-jenny`).
  - You may **read** `../Vikisol-Arena-BE` (controllers and DTOs) to get paths and shapes right.
  - Never edit the backend.
- **Git:**
  - Commit after every step.
  - Try `git push` once after each commit. If the push fails (network), carry on working and push later; never loop on it.
  - **Never** merge to or push `main`. Never force-push.
- **Backend:** `http://localhost:8081/api/v1`.
  - The backend builder is working in parallel and may restart it. If it's down, wait 60 seconds and retry, up to 5 times.
  - If it's still down, start it yourself with the command in the backend README (`SEED_ENABLED=false`, `SPRING_PROFILES_ACTIVE=local`).
  - **Never reset the database.**
- **Before logging an API issue,** open the backend controller and check the real path and DTO. Most "missing" endpoints are path mistakes.
- **Design:** the B+ design stays exactly as it is; only the data source changes.
- **No fake data.** Where something isn't available, show a designed, honest empty or "not available yet" state.
- **Tests:** never loosen, skip or delete a test to make it pass. Fix the cause.
- **Tokens and context:**
  - Use targeted tests while working; run the full suite once per step.
  - No screenshots.
  - When your context gets long, write a progress note to `REPORTS.md`, commit it, and continue. Use `/compact` if it's available.
- **Reports:** append to `docs/missions/REPORTS.md` after each step: what changed (files), what works end to end, what's blocked.


## QA loop (added 2 Oct): an independent tester is running in parallel
- Between every step, read `docs/missions/QA-BUGS.md`.
- Fix every **OPEN BLOCKER** and **MAJOR** that is a frontend problem before starting the next step (MINOR ones at Step 9), and mark each `FIXED <commit>`.
- Backend-owned bugs: copy them into `API-ISSUES.md`.
- The tester's files (`tests/qa/**`, `playwright.qa.config.ts`, `QA-BUGS.md`, `REPORTS-QA.md`) are theirs. Commit them with your commits, but don't edit them except for the status line.
- Add `tests/qa/.artifacts/` to `.gitignore`.
- Keep `npm run dev` available on port 3000 for the tester.

## Step 0: finish area 3b (in progress; uncommitted work exists)
Continue from the working tree:
- `src/lib/api/activities.ts`;
- `ActivityLifecycle.tsx`;
- `ActivityCreateFlow.tsx`, `KindPicker.tsx`, `ActivityScreen.tsx`, `CheckInSheet.tsx`;
- `publish.ts`, `taxonomy.ts`;
- `tests/local/zz-area3b-journey.local.ts`.

The full spec is in `INBOX-CLAUDE-CODE.md` → "Architect review of area 3". Photo upload now works locally (backend B12: `POST /media/upload-signature` falls back to local disk, same shape).

Remove scratch items that shouldn't be committed (`.next-real-smoke/` → gitignore). The journey test must pass: create → details → questions → join with answers → approve → exact point revealed → check-in → confirm or dispute → feedback.

## Step 1: SAFETY NET, so the app is deployable at any moment
In `api` mode (`NEXT_PUBLIC_ARENA_DATA=api`), **every route** of the three apps must render without fixtures and without crashing. A route whose area isn't wired yet shows an honest state.

- Add a test that visits every route from `src/lib/dev/screens.json` in api mode and fails on a crash, a console error or any fixture import.
- Then `VERCEL_ENV=production NEXT_PUBLIC_ARENA_DATA=api npm run build` must pass.

**From here on, the branch must stay production-buildable after every commit.**

## Steps 2–7: wire the remaining areas, in this order
For **each** area:
1. List the backend controllers and endpoints for it, by reading the backend source.
2. Wire every screen in `ARENA-APP-FLOW.md` for that area to them.
3. Verify through the real screens with two real accounts.
4. Add a journey test.
5. Delete that area's mock and fixture usage.
6. Commit, then report.

| Step | Area | Scope |
|---|---|---|
| 2 | Area 4 | needs and offers, the coordination room, mark completed, outcomes (`/needs/*`, responses, confirm) |
| 3 | Area 5 | inbox, conversations, notifications, search (`/search`: `near=true` means "near me" and returns `distanceBand`, not kilometres), blocks, reports |
| 4 | Area 6 | Work and career: career profile (CTC "Only me" by default; "include my CTC" per application), resume, jobs, apply, track, offer decision (only the candidate accepts → Hired) |
| 5 | Area 7 | Arena for Business |
| 6 | Area 8 | Admin (`/admin/*`, 2FA) and Account |
| 7 | Area 9 | Jenny |

Details for the larger areas:
- **Area 7:** company onboarding; verification (domain email code + admin approval → badge); jobs (pay range required; reopening needs verification); the pipeline, which follows the backend's allowed moves APPLIED→SCREENING→INTERVIEW→OFFER, plus →REJECTED (**disable the moves that aren't allowed**); interviews; messages (allowed only after an application or an accepted connect request); connect requests; unlock credits; billing.
- **Area 8, Admin:** overview, verification, moderation (warn/suspend/ban), users, companies, content, catalog, disputes, Jenny & AI, flags, audit + CSV, team, industries.
- **Area 8, Account:** export, delete, notification preferences, visibility.
- **Area 9:** use only what the backend exposes today (the JennySol v1 gateway). Every v2 feature (rows 42–47) shows a designed "Jenny can't do this yet" state. Then fix the 7 failing `jenny.local.ts` tests properly (update them to the real behaviour; don't delete them).

## Step 8: remove all dummy data
- Delete `src/lib/mock/*`, `src/lib/preview-off/*`, `src/lib/data/fixtures.ts`, the mock branches in `src/lib/api/*` (including `mockNameFor`), the fixture-only `/dev/*` routes, and the people fixtures in `public/fixtures/` (keep only real design assets, credited).
- `grep -rn "lib/mock\|preview-off\|fixtures\|isRealMode" src` must return nothing, or only the single data-mode guard.
- The "Preview data" bar is gone.

## Step 9: release candidate
1. Run the full local suite, typecheck, lint, and the production build in api mode. All green.
2. Write `docs/missions/RELEASE-CHECKLIST.md`:
   - exact Vercel Production env vars (names and the non-secret values: `NEXT_PUBLIC_ARENA_DATA=api`, `NEXT_PUBLIC_API_BASE_URL=https://api-arena.vikisol.in/api/v1`);
   - the production branch;
   - what to click;
   - what works and what's "not available yet";
   - the open `API-ISSUES.md` entries.
3. Open (or update) a **draft PR** `feature/arena-vnext-mobile-jenny` → `main`, titled "Arena B+ — first real-backend release". **Do not merge it.**
4. Final report at the top of `REPORTS.md`: **"FE RELEASE CANDIDATE READY"**, or exactly what is not done and why.
