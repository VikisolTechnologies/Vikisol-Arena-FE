# Inbox: Claude Code (frontend), from the architect
**Rule:** when the founder says "check your inbox", read this file top to bottom, do every OPEN mission, then mark it DONE here with the commit hash. Commit + push after each mission. Screens you change go back to **Built**; only the architect sets Approved.


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

## Mission M5 (DONE, 1 Oct 2026, commit 735c049): backend follow-ups, before the real-API switch
The backend (PR #4, `feature/admin-account-gaps`, 253 tests) has shipped row 61 (report a person), row 62 (open industries) and CORS max-age. Do **not** switch any screen to the real API yet; that is M6.

1. **Commit and push this inbox file first** (together with `INBOX-BACKEND.md`), so the backend session can read them on GitHub.
2. **Remove autopilot everywhere:**
   - `src/app/admin/flags/page.tsx`;
   - `src/lib/types.ts`;
   - `src/components/settings/SettingsSheets.tsx`;
   - the `platformAdmin.ts` mock flag;
   - `tests/e2e/admin/admin-routes.spec.ts`.

   `tests/local/agent-approval.local.ts` must assert **supervised** (per-action approval) instead of autopilot; the backend deleted the flag in V42. After this, `grep -ri autopilot src tests` returns nothing.
3. **Make `Industry` a plain string** in `src/lib/types.ts`:
   - add `src/lib/data/industries.ts` that loads `GET /public/industries`, with the five current values as the preview fixture;
   - every industry picker (company profile, career prefs, job post, admin) reads from it;
   - retired industries are not offered;
   - show an existing retired value as-is.
4. **Report a person:** wire the Report action on `/people/[id]` to a data-layer function `reportPerson(id, { reason, evidenceUrls? })` → `POST /profile/{id}/report`:
   - preview mode keeps the fixture behaviour;
   - handle 400 (self or duplicate open report: "You've already reported this person — we're looking at it") and 404 ("This profile isn't available").
5. **Gap numbering:** the backend implemented from Cursor's old numbering and matched rows by number, which is wrong.
   - In `docs/FE-API-GAPS.md`, add a column **"Endpoint key"** (e.g. `GET /admin/team`);
   - add a line at the top: *"Rows are matched by endpoint, not number. Numbers 42–62 on `feature/arena-vnext-mobile-jenny` are canonical."*
   - Mark rows 48–54, 61 and 62 **"BE: built in PR #4 — verify"**, and 55–60 **"BE: check"** (the backend may have built some under other numbers).
6. Run the mock suite and local tests, regenerate shots **only** for the screens you touched, then say **"M5 done"** with the hashes.

## Mission M5.1 (CANCELLED, 1 Oct 2026): fixture work stops; the dummy data is being removed
<details><summary>was</summary>

Read `docs/reviews/ARCHITECT-REVIEW-5-2026-10-01.md`.
- Set the five approved screens to **Approved** in `screens.json`, noting the architect's review 5.
- Fix `biz-company`: GreenLeaf's industry is not "Sales". Add a realistic admin-added industry to the preview fixture.
- Re-shoot `biz-company` only, commit, push, and write the report to `REPORTS.md`.

</details>

## Mission M6 (OPEN, 1 Oct 2026, TOP PRIORITY): real backend only; remove all hardcoded data
**Founder's direction:** no more time on dummy data. Arena must be a working prototype on the real backend that he can test himself.

### Rules
- **No new fixture work.** When something has no endpoint, show an honest empty or "not connected yet" state, never fake data.
- **Keep the B+ design exactly.** Only the data source changes.
- **Empty states matter now.** The network starts empty, so every list gets a designed empty state with the next action, e.g. "No activities near you yet. Host the first one".
- **API mismatches:** write each one into `docs/missions/API-ISSUES.md` (endpoint, what the FE expects, what the BE returns). Don't work around them in the frontend; the backend fixes them.

### Steps
1. **Real mode by default.**
   - Set `NEXT_PUBLIC_ARENA_DATA=api` and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8081/api/v1` in `.env.local`, running against the backend on this Mac (the backend window does B9).
   - Remove the "Preview data" bar.
2. **Switch the data layer (`src/lib/data/*`, `src/lib/api/*`) to the real API, area by area.** Commit, push and report after each area:
   1. auth and onboarding (sign up, sign in, refresh, sign out, 18+);
   2. You, profile and settings (#58–60, visibility, report a person);
   3. Feed, Discover and Map, activities (create, intake, join and approval, check-in, cancel, dispute), covers;
   4. needs and offers, coordination room, outcomes;
   5. inbox, conversations, notifications, search;
   6. Work and career (career profile, jobs, apply, track);
   7. Arena for Business (company onboarding, verification request, jobs, pipeline including Hired, interviews, messages, billing credits);
   8. Admin (#48–57) and Account (export, delete);
   9. Jenny:
      - use only what exists (the JennySol v1 gateway via the backend);
      - rows 42–47 (v2) show "Jenny can't do this yet" states, no fake output.
3. **Delete the dummy data** once each area is switched:
   - `src/lib/mock/*`, `src/lib/preview-off/*`, `src/lib/data/fixtures.ts`;
   - the people and photo fixtures in `public/fixtures/` (keep only images used as design assets, and credit them);
   - the `/dev/*` preview routes that depend on fixtures.

   **Goal:** `grep -rn "lib/mock\|preview-off\|fixtures" src` returns nothing.
4. **Tests.**
   - Rewrite the mock-based e2e tests to run against the local backend (a fresh database per run).
   - Keep the a11y and performance checks.
   - **Never loosen a test to make it pass; fix the cause.**
5. **Live preview.**
   - Once areas 1–3 work locally, push. Vercel builds the branch preview; use `preview-arena.vikisol.in` if it's mapped to this branch.
   - The founder sets `NEXT_PUBLIC_ARENA_DATA=api` and `NEXT_PUBLIC_API_BASE_URL` in Vercel after the architect approves the backend deploy.
   - Tell him exactly which variables and which URL.
6. **Report** after each area in `REPORTS.md`:
   - what works end to end;
   - what's blocked, with its API-ISSUES entry;
   - test counts.
