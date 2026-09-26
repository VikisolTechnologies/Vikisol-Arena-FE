# Progress

Updated 26 Sep 2026. Resume from here. Do not redo STEP 1 or the VNext shell.

## Current step

STEP 4 through STEP 7 of `docs/ARENA-MISSION.md`, on `feature/arena-vnext`. The unmerged pull request is https://github.com/VikisolTechnologies/Vikisol-Arena-FE/pull/1. Do not merge it.

## Done

- STEP 1 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returned that commit. Isolated mobile first paint held the 2.5s budget. The budget was not loosened.
- STEP 2: company-admin 2FA was never forced. Written in `docs/ARENA-CURRENT-STATE.md`, `docs/DECISIONS.md`, and `docs/SECURITY-FINDINGS.md`. Auth was not changed.
- STEP 3: Jenny write-body and scope contract tests are on the backend branch `feature/arena-jenny-contract`. A token without `arena.createPost`, and a token for a different user, both get 403 on `POST /posts`.
- STEP 4: `docs/ARENA-VNEXT-BLUEPRINT.md` and `docs/design/vnext.html` are on `feature/arena-vnext`. Dark and orange is the built UI. Ivory is the comparison in the mockup file.
- STEP 5: the shell, Feed, Create, Work, Discover, Map, Profile, and Jenny slots are in `src/components/vnext/`. Protected preview for `f3cb239`: https://arena-245mpnx8x-vikisol-technologies-projects.vercel.app (Vercel SSO).

## Next

Finish the STEP 6 gaps that are still open, then update `docs/ARENA-VNEXT-REPORT.md` to the STEP 7 checklist. Leave the pull request unmerged.

Still open on STEP 6:

- Playwright for every route and every role on the preview, desktop plus Android plus iPhone.
- The twelve-step mobile golden path with two test accounts, including signup, a Need, a response, a room, an outcome, notifications, logout, and a deep link.
- The enterprise path through post, review, interview, and hire.
- IDOR coverage on every write.
- First JS on `/home` is still over 200KB gzipped. Do not hide the number or loosen the assertion.
- The public landing page is only partly rewritten for the network positioning.

## Do not

- Merge `feature/arena-vnext`.
- Change Jenny's write JSON.
- Turn on company-admin 2FA in this run.
- Touch Vikisol One.
- Commit `mvnw` mode changes, `.env.test`, or Playwright auth JSON.
