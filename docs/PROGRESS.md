# Progress

Updated 27 Sep 2026. Resume from here.

## Current step

M1A functionality is on `feature/arena-vnext-mobile-jenny` at `d746cf9`. The visual correction is in the following commit on the same branch. The comparison is `docs/reviews/m1a-visual-correction/REVIEW.md`. Old screenshots stay in `docs/reviews/m1a/`. Do not merge PR #1. Do not deploy this branch to production.

## Done

- M1A `d746cf9`: public signup is only "Join as a person" or "Create a company account". Onboarding does not invent a title, city, or career. Completion is stored only after the profile writes return. The first feed stays empty when nothing has been posted.
- STEP 1 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returned that commit. Isolated mobile first paint held the 2.5s budget. The budget was not loosened.
- STEP 2: company-admin 2FA was never forced. Written in `docs/ARENA-CURRENT-STATE.md`, `docs/DECISIONS.md`, and `docs/SECURITY-FINDINGS.md`. Auth was not changed.
- STEP 3: Jenny write-body and scope contract tests are on backend `main` at `ab6dcc6`. A token without `arena.createPost`, and a token for a different user, both get 403 on `POST /posts`. The write JSON did not change.
- STEP 4: `docs/ARENA-VNEXT-BLUEPRINT.md` answers the mission's ten questions, and `docs/design/vnext.html` has phone and desktop frames for the six screens, dark beside ivory.
- STEP 5: the shell, Feed, Create, Work, Discover, Map, Profile, and Jenny slots are in `src/components/vnext/`.
- Review fixes, newest first: R6 `30a08a5` (181.4KB gzipped modern JS on `/home`), R5 `296875b`, R4 frontend `be88a18` plus `a0af5c1` and backend `667df7c`, R3 frontend `21a3996` and backend `c2c8807`, R2 frontend `129a20f` and backend `454c6ef`, R1 `220077c`, R8 `57c8f26`. The response with evidence is `docs/reviews/24b488d.md`.

## Next

Architect review of M1A. The rich feed card, Discover's map mode, and the optional career layer (résumé, notice period, compensation) are not in this commit. P0 (`fix/p0-security-honesty`) is a separate branch and is not merged.

## Do not

- Merge `feature/arena-vnext` or PR #1.
- Deploy VNext to production or change DNS.
- Change Jenny's write JSON.
- Turn on company-admin 2FA in this run.
- Touch Vikisol One.
- Commit `mvnw` mode changes, `.env.test`, or Playwright auth JSON.
