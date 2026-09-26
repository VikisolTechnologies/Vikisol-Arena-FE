# Arena VNext report

26 September 2026. The new screens are on `feature/arena-vnext`. That branch is not merged. Production `main` has the offer labels; the new screens stay on the preview.

## What is live

Frontend `main` in git is `8c11dbc`. That commit labels an offer everywhere the live app maps an intent, and the Discuss filter includes offers. `https://arena.vikisol.in/version` was still the cleanup commit `5a1b52d` when this report was last checked; Vercel deploys `main` from GitHub.

Backend `main` is `d3b5eff`. `https://api-arena.vikisol.in/api/v1/version` returned that commit, built `2026-09-26T13:11:48Z`. A guest `GET /posts/joined` returns 401. Jenny's write JSON is unchanged. `JennyArenaWriteBodyContractTest` locks the bodies. `JennyArenaWriteScopeContractTest` calls `POST /posts` and expects 403 for a service token that lacks `arena.createPost`, and 403 for a token whose subject is a company admin. Both passed before the fast-forward.

The full local suite against the cleanup, one worker, was 236 passed, 4 skipped, 2 failed. The two failures were cold mobile FCP on the landing page (3780ms) and `/home` (4248ms) while this machine was also building the preview. The same file, run alone, passed in 37 seconds, including both of those assertions at the 2.5s budget. The budget was not loosened.

## Preview

Protected preview, behind Vercel SSO: https://arena-web-git-feature-arena-vnext-vikisol-technologies-projects.vercel.app. It is not a public URL. Do not point DNS at it. The branch was rebased onto `main` (`8c11dbc`) and is not merged. Pull request: https://github.com/VikisolTechnologies/Vikisol-Arena-FE/pull/1. The earlier preview for `f3cb239` was https://arena-245mpnx8x-vikisol-technologies-projects.vercel.app.

Test logins stay in `TEST-LOGINS.md` and the gitignored `.env.test`. They are not copied here.

## What was built

Primary look: near-black `#09090b` and orange `#ff6b35`. The ivory, black, and orange alternative is only in `docs/design/vnext.html`, beside the dark mockups, for the founder to compare. The running preview uses the dark option.

| Surface | Route | What it does |
|---|---|---|
| Feed | `/home` | Real feed items. No page-size count. Empty copy is "Arena is quiet right now." |
| Discover | `/discover` | The same public list until a search is submitted, then people, activities, jobs, projects, and companies. |
| Map | `/map` | Nearby activities, Hyderabad centre, 10 km. No map library on first load. |
| Work | `/work` | Applications, bids, interviews for a hiring manager, hosted needs and activities, and approved joins. Active or Done. A guest is asked to sign in. |
| Create | sheet | Ask, offer, project, activity, or a job. An offer is stored as offer. A job needs a company seat. Nothing publishes until the person submits. |
| Profile | `/identity` | Name, title, posts, and four counts: needs resolved, activities hosted, activities joined, projects won. |
| Jenny | slot | One real note from Arena's agent API, which already calls the live gateway. Empty when there is no session, no sentence, `NONE`, or the unavailable message. |

Sessions stay activity posts. Waitlist, maybe, recurrence, cost, and co-host UI are not built. The flag name `sessions-extended` is off and has no code path.

New UI code is about 520 lines in `src/components/vnext/`.

## Bundle

Production build of `/home` on `30a08a5`, with a DSN set so Sentry stays in the graph, scripts in the document:

- 181.4KB gzipped in a browser that skips `<script noModule>`.
- 219.9KB if the 38.5KB legacy polyfill is counted.

Sentry and the command palette load after idle. GSAP, the 3D scenes, the create sheet, and the Jenny slot stay separate chunks. The 200KB budget is met on the modern number. The assertion was not removed.

## Tests

Local server `http://127.0.0.1:3456`, API proxied to production, one worker, 26 Sep 2026:

- VNext surfaces and landing: 13 passed on desktop Chrome at 1440×900. Pixel 7 (412×915) and iPhone 13 (390×844) then passed the same files, 21 passed.
- Axe and the static route sweep, desktop Chrome: 57 passed, then 2 failed on `/work` and `/identity` because `GET /posts/joined` was not deployed. After backend `main` `667df7c`, those two routes passed on a re-run.
- The twelve-step two-account journey passed on iPhone 13 (390×844) against the live API through the local preview proxy (`bdfdb48`, 1.1m). Cleanup signed in again after logout and recorded `need … closed`, `activity … deleted`, and both throwaway accounts erased.
- The enterprise path passed on desktop Chrome (1440×900): post, review, interview, offer. The application was withdrawn and the posting was closed.
- Visual QA passed 33 shots at 1440×900, 412×915, and 390×844 for the logged-out shell, the talent shell, and company postings. Feed, Work, Map, and Profile render. The Next.js dev badge overlaps the first bottom-nav label in local `next dev`; it is not in the Vercel build. At 390px the enterprise nav clips the last item. Map still says nothing is nearby in 10 km around Hyderabad.

## Phone checks

1. Bottom bar: Feed, Discover, Map, Work, You. Each target is 44px tall on a 390px width.
2. Create is a 44px orange button and stays clear of the build stamp.
3. The signed-in name is in the header, next to an Inbox link to `/rooms`.
4. Jenny shows a real job link when the gateway has one, and nothing when it does not.
5. The feed does not print a page-size count. Map does not load Google Maps.

## Blockers

- Sentry ingest still returns 403 until the project allows `arena.vikisol.in`.
- GitHub's OAuth token cannot edit `.github/workflows/e2e.yml` (missing `workflow` scope). The demo-password comment in that file is still on `main`.
- `GET /posts/joined` requires a signed-in caller as of backend `c68a22b`. A guest gets 401. `d3b5eff` rejects resolving someone else's need, and resolving anything that is not a need.
- Map's 10 km search around Hyderabad returned no activities, while the feed shows Kondapur activities. The screen says so. It does not invent pins.
- Vercel preview protection was not changed.
- Preview runs wrote to production. Throwaway accounts were `b2.host.*` and `b2.guest.*`. Bodies were prefixed `TEST B2`. The last golden run closed the need (a room message blocks hard delete), deleted the activity, and erased both accounts. Public `GET /posts/feed` then had no `TEST B2` or `Golden path test` rows. Six older `Golden path test activity` posts on the demo talent are `cancelled`, so they stay off the feed and still appear on that profile. Four `TEST B2 role` jobs on the demo company are `closed` (the API has no hard delete) and are not in the public feed. They remain on the company postings page.

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
