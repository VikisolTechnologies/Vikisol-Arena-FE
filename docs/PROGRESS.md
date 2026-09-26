# Progress

Updated 26 Sep 2026. Resume from here. Do not redo STEP 1 or the VNext shell.

## Current step

Review `docs/reviews/24b488d.md` is answered on `feature/arena-vnext`. The unmerged pull request is https://github.com/VikisolTechnologies/Vikisol-Arena-FE/pull/1. Do not merge it.

## Done

- STEP 1 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returned that commit. Isolated mobile first paint held the 2.5s budget. The budget was not loosened.
- STEP 2: company-admin 2FA was never forced. Written in `docs/ARENA-CURRENT-STATE.md`, `docs/DECISIONS.md`, and `docs/SECURITY-FINDINGS.md`. Auth was not changed.
- STEP 3: Jenny write-body and scope contract tests are on backend `main` at `ab6dcc6`. A token without `arena.createPost`, and a token for a different user, both get 403 on `POST /posts`. The write JSON did not change.
- STEP 4: `docs/ARENA-VNEXT-BLUEPRINT.md` answers the mission's ten questions, and `docs/design/vnext.html` has phone and desktop frames for the six screens, dark beside ivory.
- STEP 5: the shell, Feed, Create, Work, Discover, Map, Profile, and Jenny slots are in `src/components/vnext/`.
- Review fixes, newest first: R6 `30a08a5` (181.4KB gzipped modern JS on `/home`), R5 `296875b`, R4 frontend `be88a18` plus `a0af5c1` and backend `667df7c`, R3 frontend `21a3996` and backend `c2c8807`, R2 frontend `129a20f` and backend `454c6ef`, R1 `220077c`, R8 `57c8f26`. The response with evidence is `docs/reviews/24b488d.md`.

## Next

The new read and close endpoints are on backend `main` at `667df7c`. An unauthenticated `GET /posts/joined` now returns 403, which means the route exists. `/work` and `/identity` were re-run after that and passed. The twelve-step two-account path and the enterprise hire path were not run. Leave the frontend pull request unmerged. It conflicts with `main`.

## Do not

- Merge `feature/arena-vnext`.
- Change Jenny's write JSON.
- Turn on company-admin 2FA in this run.
- Touch Vikisol One.
- Commit `mvnw` mode changes, `.env.test`, or Playwright auth JSON.
