# Arena VNext report

26 September 2026. The new screens are on `feature/arena-vnext`. That branch is not merged. Production still serves the cleanup that landed on `main`.

## What is live

Frontend `main` is `5a1b52d`. `https://arena.vikisol.in/version` returns that commit, built `2026-09-26T06:48:42Z`. The cleanup is contrast, the guest home label, the companies card, dead-component removal, and the dev-only API proxy. It does not change the product screens.

The full local suite against that cleanup, one worker, was 236 passed, 4 skipped, 2 failed. The two failures were cold mobile FCP on the landing page (3780ms) and `/home` (4248ms) while this machine was also building the preview. The same file, run alone, passed in 37 seconds, including both of those assertions at the 2.5s budget. The budget was not loosened.

Backend write shapes used by Jenny are locked by `JennyArenaWriteBodyContractTest` on `feature/arena-jenny-contract` (`d9940fa`). That branch is not merged. The live endpoints were not changed.

## Preview

The first Vercel preview of `78ab5a0` failed to build. Next.js 16 rejects `ssr: false` inside a Server Component, and the shell had put that in `layout.tsx`. The command palette now loads from a client wrapper. A later push of this branch is the preview to open. The URL is recorded in the pull request. If that preview is public, it is listed in `docs/BLOCKERS.md`. Do not point DNS at it.

Test logins stay in `TEST-LOGINS.md` and the gitignored `.env.test`. They are not copied here.

## What was built

Primary look: near-black `#09090b` and orange `#ff6b35`. The ivory, black, and orange alternative is only in `docs/design/vnext.html`, beside the dark mockups, for the founder to compare. The running preview uses the dark option.

| Surface | Route | What it does |
|---|---|---|
| Feed | `/home` | Real feed items. Pulse is the count of that response. Empty copy is "Arena is quiet right now." |
| Discover | `/discover` | The same public list until a search is submitted, then people, activities, jobs, projects, and companies. |
| Map | `/map` | Nearby activities, Hyderabad centre, 10 km. No map library on first load. |
| Work | `/work` | This person's applications. A guest is asked to sign in. |
| Create | sheet | Ask, offer, project, activity, or a job. A job needs a company seat. Nothing publishes until the person submits. |
| Profile | `/identity` | Name, title, and posts this account actually made. |
| Jenny | slot | One real note from Arena's agent API, which already calls the live gateway. Empty when there is no session, no sentence, `NONE`, or the unavailable message. |

Sessions stay activity posts. Waitlist, maybe, recurrence, cost, and co-host UI are not built. The flag name `sessions-extended` is off and has no code path.

New UI code is about 520 lines in `src/components/vnext/`.

## Bundle

Production build of `/home`, scripts in the document:

- 253KB gzipped in a browser that skips `<script nomodule>`.
- 292KB if the 38KB legacy polyfill is counted.

About 198KB of that is the Next.js client runtime, about 18KB is the Sentry client SDK, and about 37KB is the shell and feed. GSAP, the 3D scenes, the command palette, the create sheet, and the Jenny slot are separate chunks. The 200KB budget is not met. The number is in `docs/BLOCKERS.md`. The assertion was not removed.

## Tests

Local preview `http://localhost:3001`, one worker, desktop Chrome, Pixel 7, and iPhone 13:

- Surface spec, golden path, access control, and axe: 88 passed, 10 failed. The failures were the old expectation that `/identity` redirects to `/auth`, the old "Sign in to post" heading, and one WebKit contrast hit on the landing page.
- Those expectations now match the guest profile and the create sheet. Access control then passed on desktop and Pixel 7 (29) and, with the WebKit axe file, on iPhone (25). The landing contrast miss did not repeat.
- Enterprise dashboard axe passed in the first run. Company-admin sign-in without a second factor is the finding in `docs/SECURITY-FINDINGS.md`, not a change.
- A fresh review of this diff re-ran the candidate golden path on a phone-sized Chrome: 9 passed. It also caught the create sheet inventing a project budget. A project now asks for the minimum, maximum, and weeks, and publishes only those.

Enterprise company-admin sign-in was already proven on the cleanup suite: the account signs in with no second factor, because enrollment was never required. That is `docs/SECURITY-FINDINGS.md`. Auth was not changed.

## Phone checks

1. Bottom bar: Feed, Discover, Map, Work, You. Each target is 44px tall on a 390px width.
2. Create is a 44px orange button and stays clear of the build stamp.
3. The signed-in name is in the header.
4. Jenny shows a real job link when the gateway has one, and nothing when it does not.
5. The feed count matches the cards on the page. Map does not load Google Maps.

## Blockers

- Sentry ingest still returns 403 until the project allows `arena.vikisol.in`.
- GitHub's OAuth token cannot edit `.github/workflows/e2e.yml` (missing `workflow` scope). The demo-password comment in that file is still on `main`.
- First JS on `/home` is 253KB gzipped. See above.
- Map's 10 km search around Hyderabad returned no activities in this session, while the feed shows Kondapur activities. The screen says so. It does not invent pins.
- Vercel preview protection was not changed.

## Merge and rollback

Do not merge this pull request until the founder has used the preview.

To ship it later:

1. Merge `feature/arena-vnext` into `main` with a normal merge. Do not force-push.
2. Wait until `https://arena.vikisol.in/version` shows that merge's commit.
3. Open `/home` on a phone and confirm the five checks above.

To roll back:

1. Revert the merge commit on `main` and push that revert. Do not reset `main`.
2. Confirm `/version` returns the cleanup commit `5a1b52d` again.

Backend: leave `feature/arena-jenny-contract` unmerged until someone wants the contract test on `main`. Merging it does not change the write endpoints. Do not change their JSON shape.
