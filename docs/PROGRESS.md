# Progress

## Architect status (current, 27 Sep 2026, 01:00 IST)
- **Gate 0 is complete** (architect). New blueprint: `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md`.
- **Mission sequence:** Cursor **P0** (security and honesty fixes) → **M1** (`docs/missions/CURSOR-M1.md`) → M2…M8 → founder preview.
- **Branches and SHAs:**
  - FE `main` = `db768bf`; BE `main` = `b376449`;
  - `origin/feature/arena-vnext` = `f310ee6` (PR #1, **open, NOT merged, never merge**);
  - JennySol `main` = `ca5ec1c`.
- **Cursor, now:** P0 is committed on `fix/p0-security-honesty` and pushed for architect review. FE `43fe4ea`. BE `a504ef0`. Feed flag is `demoContent`. `bash mvnw test` passed before the rename of that flag (the rename is the record field only). Production env was not changed. GitHub rejected the frontend workflow-file edit, so `.github/workflows/e2e.yml` still matches `main`.
- **Next, after P0 review:** M1 on `feature/arena-vnext-mobile-jenny`, created from `f310ee6`. Not started.
- **Gemini:** production returns 402 (prepaid credit depleted). UI, fixtures, contracts and tests continue; live AI validation waits for the founder's top-up.
- **Deployment gate:**
  - VNext goes only to the protected preview `preview-arena.vikisol.in`;
  - production promotion needs green checks + architect review + founder visual approval + a verified commit stamp + a mobile smoke test;
  - P0 fixes follow their own reviewed release path.
- **Docs to commit** (architect-written, on the docs branch `docs/control-plane`):
  - `CLAUDE.md`, `AGENTS.md`;
  - `docs/VIKISOL-MASTER-CONTEXT.md`, `docs/ARENA-MISSION.md`, `docs/ARENA-VNEXT-MOBILE-JENNY-BLUEPRINT.md`;
  - `docs/missions/CURSOR-M1.md`, `docs/reviews/AUDIT-2026-09-26.md`, this file.

---

The sections below the architect status are the history of 26 Sep 2026; the **architect status** directly below is the current state.

## Sentry

26 Sep 2026. The old ingest 403 was a DSN for a project that no longer exists. The new DSNs are environment variables on Vercel (`arena-web`, Production and Preview) and Railway (`arena-staging` / `arena-api`). They are not in git.

- Frontend `73eafc130571393eae4a34f576e91032944f77df`. Backend `18f2dfcc8978170ff0cbd24b3ae2ef0c90eef296`. The preview branch has the same scrub at `b4f1d3374ec18edd9891f2d4c40ec254464b446b`. Pull request #1 was not merged.
- Both SDKs set `sendDefaultPii` to false. Session Replay is not registered. `beforeSend` removes cookies, authorization headers, and the request body.
- `https://arena.vikisol.in/version` returned `73eafc1`, built `2026-09-26T14:33:30Z`. `https://api-arena.vikisol.in/api/v1/version` returned `18f2dfc`, built `2026-09-26T14:34:11Z`.
- One test event from each running app: arena-web `780faaa2ae824ddf8f9adf2183fa3164` (the web SDK reported the event sent) and arena-api `ee93af79ba5a4153a4f8abc6b6b5e90a`. Opening the Sentry issue list still requires a login, so the project pages were not viewed from here.
- The Playwright monitor no longer ignores Sentry ingest responses. The one-shot wiring routes were removed after the check.

## Current step

STEP 4 through STEP 7 of `docs/ARENA-MISSION.md`, on `feature/arena-vnext`. The unmerged pull request is https://github.com/VikisolTechnologies/Vikisol-Arena-FE/pull/1. Do not merge it.

## Done

- STEP 1 cleanup is on `main` at `5a1b52d`. `https://arena.vikisol.in/version` returned that commit. Isolated mobile first paint held the 2.5s budget. The budget was not loosened.
- STEP 2: company-admin 2FA was never forced. Written in `docs/ARENA-CURRENT-STATE.md`, `docs/DECISIONS.md`, and `docs/SECURITY-FINDINGS.md`. Auth was not changed.
- STEP 3: Jenny write-body and scope contract tests are on the backend branch `feature/arena-jenny-contract`. A token without `arena.createPost`, and a token for a different user, both get 403 on `POST /posts`.
- STEP 4: `docs/ARENA-VNEXT-BLUEPRINT.md` and `docs/design/vnext.html` are on `feature/arena-vnext`. Dark and orange is the built UI. Ivory is the comparison in the mockup file.
- STEP 5: the shell, Feed, Create, Work, Discover, Map, Profile, and Jenny slots are in `src/components/vnext/`. Protected preview for `f3cb239`: https://arena-245mpnx8x-vikisol-technologies-projects.vercel.app (Vercel SSO).
- B1–B5 in `docs/reviews/998eefb.md` are answered there. The joined-posts guest bug is fixed on the live API. The phone journey, hire path, and visual QA ran. Pull request #1 stays unmerged.

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
