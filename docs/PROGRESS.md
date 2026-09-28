# Progress

Updated 28 Sep 2026. Resume from here.

## P0 release (production)

28 Sep 2026. Audit P0-1 and P0-2 are on `main` and live.

- Backend merge `8ebccb6` (PR Vikisol-Arena-BE#1 from `a504ef0`). Railway `arena-api` deployment `35679797` SUCCESS.
- Frontend merge `4225f9e` (PR Vikisol-Arena-FE#2 from `43fe4ea`). `https://arena.vikisol.in/version` returns `4225f9e`.
- Railway production: `SEED_ENABLED=false`; platform-admin email/password set (non-demo address); `ARENA_DEMO_PASSWORD` set and not a retired public value; `ADMIN_2FA_REQUIRED` unset so the app default `true` applies.
- Lockdown on boot: marked 105 seeded accounts, rotated 105 published passwords, disabled 1 demo platform admin.
- Retired published passwords return HTTP 401 for `admin@vikisol.dev` and `demo.talent@vikisol.dev`.
- `GET /api/v1/public/landing-stats` returns honest counts excluding demo (`openToWorkCount: 6`). Featured project is null when nothing real remains.
- VNext PR #1 stays OPEN and unmerged.

Claude Code owns Arena frontend from here. Cursor does not start M1.

## Current step

Frontend continues under Claude Code. VNext preview work stays on `feature/arena-vnext` / `feature/arena-vnext-mobile-jenny`. Do not merge PR #1.

## Done

- P0 production release (this section).
- STEP 1 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returned that commit. Isolated mobile first paint held the 2.5s budget. The budget was not loosened.
- STEP 2: company-admin 2FA was never forced. Written in `docs/ARENA-CURRENT-STATE.md`, `docs/DECISIONS.md`, and `docs/SECURITY-FINDINGS.md`. Auth was not changed.
- STEP 3: Jenny write-body and scope contract tests are on the backend branch `feature/arena-jenny-contract`. A token without `arena.createPost`, and a token for a different user, both get 403 on `POST /posts`.
- STEP 4: `docs/ARENA-VNEXT-BLUEPRINT.md` and `docs/design/vnext.html` are on `feature/arena-vnext`. Dark and orange is the built UI. Ivory is the comparison in the mockup file.
- STEP 5: the shell, Feed, Create, Work, Discover, Map, Profile, and Jenny slots are in `src/components/vnext/`. Protected preview for `f3cb239`: https://arena-245mpnx8x-vikisol-technologies-projects.vercel.app (Vercel SSO).
- B1–B5 in `docs/reviews/998eefb.md` are answered there. The joined-posts guest bug is fixed on the live API. The phone journey, hire path, and visual QA ran. Pull request #1 stays unmerged.

## Next

Claude Code: Arena frontend mission from the blueprint. Leave PR #1 unmerged. Do not deploy VNext to production without founder approval.

Still open from earlier VNext work (not P0):

- Playwright for every route and every role on the preview, desktop plus Android plus iPhone.
- The twelve-step mobile golden path with two test accounts.
- The enterprise path through post, review, interview, and hire.
- IDOR coverage on every write.
- First JS on `/home` is still over 200KB gzipped. Do not hide the number or loosen the assertion.
- The public landing page is only partly rewritten for the network positioning.

## Do not

- Merge `feature/arena-vnext` or PR #1.
- Change Jenny's write JSON.
- Touch Vikisol One.
- Commit `mvnw` mode changes, `.env.test`, or Playwright auth JSON.
- Print credentials in any report.
