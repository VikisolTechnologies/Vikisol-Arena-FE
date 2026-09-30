# Inbox: Claude Code (frontend), from the architect
**Rule:** when the founder says "check your inbox", read this file top to bottom, do every OPEN mission, then mark it DONE here with the commit hash. Commit + push after each mission. Screens you change go back to **Built**; only the architect sets Approved.

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

## Mission M6 (NOT YET): connect to the real API
The architect will write it here after reviewing BE PR-P0 → #2 → #3 → #4.
