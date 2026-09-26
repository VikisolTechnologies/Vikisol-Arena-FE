# Arena current state

Date: 2026-09-26. Method: read both Arena repos, compared `/version` to git, and opened the live app at `https://arena.vikisol.in` as a guest (landing, Home, Nearby, Discuss, Work). Where an older markdown file disagrees with the code or the live site, this file follows the code and the live site.

JennySol and Vikisol One were not changed and were not audited in depth. They stay out of scope.

## 1. Repo and deploy

| | Frontend | Backend |
|---|---|---|
| Repo | `VikisolTechnologies/Vikisol-Arena-FE` | `VikisolTechnologies/Vikisol-Arena-BE` |
| Branch | `main`, even with `origin/main` | `main`, even with `origin/main` |
| HEAD | `30934422cc87b5ce23aebb33880df4820839c9f1` | `93eddd29bf15a115d2626cf7e3754c13ac2cd201` |
| Live `/version` | `https://arena.vikisol.in/version` matches HEAD. Built `2026-09-25T22:15:14Z` | `https://api-arena.vikisol.in/api/v1/version` matches HEAD. Built `2026-09-25T22:14:20Z` |
| Host | Vercel (`vikisoltech`) | Railway project `arena-staging`, service `arena-api`, production env. Postgres and Redis online |
| Uncommitted | `docs/ARENA-FLOW-AND-MOBILE-REVIEW.md` (review only, nothing fixed) | `mvnw` file-mode only, zero line changes |

Production is the current `main`. There is no hidden unpushed product branch.

Recent product work already on `main` (preserve this):

- Leave an activity, and mark whether someone showed up (`V19__join_outcome.sql`, `outcome` on `arena_post_joins`).
- Jenny proposes actions; the person approves. Home links into Jenny.
- Anonymous posts, replies, and chats.
- Discuss communities, votes, threads.
- Arena-wide search.
- Photo and video posts (signed Cloudinary).
- Guests can browse feed, jobs, projects, and companies.
- Email OTP sign-in.

## 2. What the product actually is today

The live brand is **near-black `#09090b` with orange `#ff6b35` / `#ff8a5b`**. Token names in `src/components/home-v3/tokens.ts` still say ivory and gold, but a founder decision on 2026-09-25 remapped those names onto the dark/orange brand. The live app is not an ivory product. Keep this palette.

The live navigation (desktop sidebar and mobile tab bar, `AppShell`) is:

| Tab | Route | What it really is |
|---|---|---|
| Home | `/home` | Mixed feed. Tabs: All, Activities, Discussions, Jobs, Bidding. Jenny prompt on top. |
| Nearby | `/map` | Activities with a time and a place. Google map plus a list. Radius 2/5/10/25 km. Defaults to Hyderabad. |
| Discuss | `/discuss` | Needs, updates, communities. |
| Work | `/work` | Open jobs, bidding, and "Mine". Discover sits under it as "Swipe through matches". |
| Inbox | `/rooms` | Activity rooms. Direct chats still have their own page at `/messages/[id]`. |

Create (`+`) opens `CreateComposer` and can make **an activity, a need (`ASK`), or an update**. It does not create a job or a project. Jobs are posted from the company side.

Profile is `/identity`, behind the menu, not a primary tab.

There is no separate Agent tab. Jenny is a prompt on Home, a floating orb, and `/agent`.

This is already a network with a job section inside it. It is not yet the target hierarchy (Feed / Discover / Map / Agent / Work / + / Profile). The biggest drift from that target: **Work is a job list (45 open roles on the guest view), and Discover is a job-swipe deck.**

## 3. Route map

Status is `live` if this session opened it, `code` if only the source was read.

### Public

| Route | Status | Notes |
|---|---|---|
| `/` | live, works | Dark companion landing. Copy already says Arena is not a job board, then still sells Talent Universe and open bids. Activity chips on the orb are illustrative, not live counts. |
| `/auth` | code, works | Email OTP, Google, phone. |
| `/pricing` `/privacy` `/terms` `/aup` | code | Present. |
| `/reset-password` `/invite/[token]` | code | Present. `ROUTES.md` still says forgot-password does not exist. It does (`V10`). |
| `/access-denied` | code | Present. |

### Talent shell (`AppShell`)

| Route | Status | Notes |
|---|---|---|
| `/home` | live, works | Real feed. Guest banner. Demo activities are badged `DEMO CONTENT`. A real update from today is on the feed. First paint is skeletons for about a second. |
| `/map` | live, partial | Map tiles load. At 10 km around Hyderabad city centre the list honestly says `0 activities nearby`. Cookie banner was covering the list until dismissed. |
| `/discuss` `/discuss/communities` `/discuss/c/[slug]` | live shell / code detail | Discuss shell is real: Ask, Share, communities, New/Top/Trending. |
| `/feed/[id]` | code, works | Post detail: join, comments, reactions, media, anonymity. This is the permalink. There is no `/p/[id]`. |
| `/work` `/work/saved` | live / code | Work loads jobs. Saved exists as a route. |
| `/discover` | code | Job swipe only (`getJobs`, pass, apply). Not people or projects. |
| `/rooms` `/rooms/[id]` | code | Inbox and activity rooms. |
| `/messages` | code | Redirects to `/rooms` (optional `?with=`). |
| `/messages/[id]` | code | Still a real direct-message thread. Second conversation system. |
| `/agent` | code | Jenny conversation. |
| `/identity` `/identity/edit` | code | Profile. Not `/me`. |
| `/people/[id]` `/companies` `/companies/[id]` | code | By id, not handle. |
| `/notifications` `/settings` `/search` `/onboarding` | code | Real pages. |
| `/jobs/[id]` | code | Job detail. List is public; detail requires a session. |
| `/applications` `/applications/[id]` | code | Candidate applications. |
| `/marketplace` `/marketplace/[id]` `/marketplace/[id]/manage` `/marketplace/bids` | code | Projects and bids. |
| `/interviews/[applicationId]` | code | Candidate interview room. |

### Company and admin (separate shells)

| Shell | Routes | Notes |
|---|---|---|
| `EnterpriseAppShell` | `/enterprise`, `/enterprise/dashboard`, `/enterprise/talent`, `/enterprise/talent/[id]`, `/enterprise/postings`, `/enterprise/postings/[id]`, `/enterprise/posts`, `/enterprise/interviews/...`, `/enterprise/messages`, `/enterprise/onboarding` | Recruiter workspace. Not renamed to `/workspace`. |
| `CompanyAdminShell` | `/enterprise/admin`, team, audit, billing, company, consent | Company admin. |
| `HiringManagerShell` | interview routes under enterprise | Separate nav. |
| `PlatformAdminShell` | `/admin`, tenants, users, moderation, analytics, flags | Platform admin. |
| `OnboardingShell` | `/onboarding` | Its own layout. |

Roles in code: talent, recruiter, company_admin, hiring_manager, platform_admin.

## 4. Feature matrix against the target hierarchy

| Surface | Built | Backend | Gap |
|---|---|---|---|
| Feed | Yes, as Home | `GET /feed` aggregates activities, updates, projects (live sample of 20: 16 activities, 3 projects, 1 update). Ranking exists (`FeedRankingService`). | Not named Feed. Jobs and bidding are tabs inside it, so the front door still feels like a job board when those tabs are used. |
| Discover | Partial | Jobs list is public. | It discovers jobs, not people, companies, and projects as a network. |
| Map | Partial | Nearby posts, coarse location, radius. Google Maps when the key is set, radar scene as fallback. | Activities only, by design in `map/page.tsx`. Needs, people, and projects are not on the map. 10 km Hyderabad was empty while Home still showed a Kondapur activity (likely outside that radius or outside the 168-hour window). |
| Agent | Partial | `AgentController`, service-token gateway, `V17`/`V18` Jenny actions with expiry. | Prompt + orb + `/agent`. Not woven through Discover, Map, and Work. |
| Work | Partial | Applications, bids, interviews, join outcome. | The screen is "open roles", not "what I am involved in". |
| + | Partial | Posts: `ACTIVITY`, `ASK`, `UPDATE`, `COMPANY`. Jobs and projects are other entities. | Create covers activity / need / update. Job and project creation stay on company and marketplace flows. |
| Profile | Partial | Profiles, follows, job-intent fields (`V13`). | Identity is real. Outcomes (showed up, hired, completed) are only starting (`V19` attendance). |
| Sessions | Partial, under another name | An activity already has start time, spots, join, leave, approval, room, reminder, attendance. | No first-class Session type. Safety (capacity, no-show, reporting) is partly there and not a separate product. |
| Discuss | Yes | Communities `V15`, votes/threads `V14`, anonymous `V16`. | A fifth primary tab the target hierarchy does not name. It is where needs live. |

Public feed check this session: `GET https://api-arena.vikisol.in/api/v1/feed` returned 200 in under a second.

## 5. API contract (shape, not a full diff)

- Context path is `/api/v1`. `/version` on the bare host 404s. The real endpoint is `/api/v1/version`.
- Envelope is `{ success, data }`.
- Controllers that own the product: Auth, Profile, Feed, Post, Room, Message, Job, Application, Project, Company, Interview, Notification, Follow, Block, Community, Search, Agent, Enterprise (talent, postings, applicants, shortlist, admin), Platform admin, Media, File, Verification, Landing, Demo content.
- Guest reads are explicit in `SecurityConfig` (feed, jobs list, projects, companies, search, discuss, some posts). Writes stay authenticated.
- `GET /jobs/{id}` uses `principal.getId()` and is not in the guest allow-list. A logged-out job click must send the person to sign in. Worth confirming in the browser on the next pass.
- Jenny never receives database credentials. Arena mints a scoped service token (`AgentServiceTokenIssuer` / `AgentServiceTokenAuthenticationFilter`) and calls Jenny through `JENNYSOL_GATEWAY_URL`.

A line-by-line FE-call versus BE-route diff is still open. No 404 or 500 was seen on the guest surfaces opened this session. Home, map, and work all showed a loader before data; that is slow first paint, not a failed request.

## 6. Component inventory

About 107 TSX components and 64 `page.tsx` routes. Shared primitives live in `src/components/ui/*` (button, card, sheet, empty-state, person-avatar, and others).

Duplicates and near-duplicates to consolidate later, without a visual change:

- Shells: `AppShell`, `EnterpriseAppShell`, `CompanyAdminShell`, `HiringManagerShell`, `PlatformAdminShell`, `OnboardingShell`. Five product shells is a lot. Talent is correctly on one shell now.
- Cards: `feed/PostCard.tsx`, `feed/FeedItemCard.tsx`, `home-v3/FeedCards.tsx`.
- Map: `map/GoogleMapView.tsx` and `map/MapRadarScene.tsx` (fallback), plus `map-v3/*`.
- Motion clones: several `*Animator.tsx` files next to the component they animate (landing, onboarding, route transitions).
- `CandidateAppShell` is gone. Comments in `not-found.tsx` and `AuraBackground.tsx` still name it.
- `MessagesInbox.tsx` may be leftover if `/messages` only redirects. Confirm before deleting.

`CreateComposer` is the one create surface. Keep it.

## 7. Dead and stale

- Docs at the FE root are a second product. `ROUTES.md`, `PRODUCT_BIBLE.md`, and `GROUND-TRUTH.md` describe an August/September plan (ivory theme, `/inbox`, `/me`, `/workspace`, feed 500s, commits that are no longer HEAD). They are useful history and unsafe as instructions.
- `TEST-LOGINS.md` still lists old `*.up.railway.app` hosts. Playwright config already notes those hosts were the same deployment as `arena.vikisol.in`.
- `railway.toml` in the frontend was called dead weight in `GROUND-TRUTH.md` (frontend deploys on Vercel). Confirm before deleting.
- Backend `mvnw` mode bit is dirty and should not be committed as a feature.

## 8. Two systems doing one job

| Pair | State |
|---|---|
| Rooms vs Messages | The Inbox list is one list: `/rooms` loads activity rooms and direct conversations together. `/messages` redirects there. A direct thread still opens at `/messages/[id]`, and enterprise has its own `MessagesInbox`. |
| Home vs Discuss vs Work | The same activity/need/job can show in more than one tab. Home has Jobs and Bidding tabs; Work is also jobs; Discuss is needs and updates. |
| Posts vs Jobs vs Projects | Three create/storage models. Feed stitches them together. The target loop wants one Need. Do not collapse the tables in a cleanup pass. |
| Map radar vs Google map | Intentional fallback, not an accident. |

## 9. Security (from code, not a new pentest)

- JWT is pinned to HS256 in `JwtTokenProvider` (sign and verify). `JwtSecretGuard` refuses a short secret.
- Roles are loaded server-side via `CustomUserDetailsService`, not trusted from a client-supplied role alone.
- Rate limit filter is on the chain. Security headers: nosniff, frame deny, CSP `default-src 'none'` on the API, HSTS.
- Agent tokens use a different secret from session JWTs, expire in at most 5 minutes, and only authorize five write endpoints (`applyToJob`, `createPost`, `joinActivity`, `createProject`, `placeBid`). Jenny never receives database credentials.
- Guest policy is read-only and listed endpoint by endpoint. `GET /jobs/{id}` is not on that list, so a shared job link asks for sign-in while a shared post, project, profile, or company does not.
- Location stored on a post is a geohash cell center, not the raw point. The exact meeting point is shown only to the author and approved people.
- Write paths that were traced (posts, joins, comments, rooms, notifications, applications, enterprise tenant checks, agent actions) load the owner from the server and compare it to the caller. `PostJoinSafetyTest` covers approving someone else's join.
- Weaker spots, not open IDOR: `ProjectService.placeBid` does not block a bid on your own project, a second bid, or a bid from someone you blocked. `ProjectController` and `InterviewController` have no class-level role, so a company account can create projects and place bids. `PostAudience.LOCAL` is stored and not used as a filter.
- `.github/workflows/e2e.yml` had the shared demo password written in a comment. That comment was removed in this pass. `TEST-LOGINS.md` still contains it, because the test docs point there. Do not copy it into new files.

## 10. Performance (this session, phone-width browser)

- Landing, Home, Nearby, Discuss, and Work all paint a full-screen or card loader before content.
- Cookie banner sits over the mobile tab bar until accepted. The orange orb is clipped by that bar (`PersistentOrb` vs `AppShell`). The commit stamp `3093442` sits on the Inbox label.
- These match `docs/ARENA-FLOW-AND-MOBILE-REVIEW.md`. None of them are fixed.
- No cold-load millisecond budget was measured this session. 3D (`three`, react-three-fiber) and Maps are dependencies; the map page lazy-loads the radar scene.

## 11. Tests

- Frontend: Playwright, 242 tests, projects for setup, desktop Chrome 1440×900, Pixel 7, iPhone 13. Scripts in `package.json`. Needs `.env.test` (gitignored) and installed browsers.
- `.env.test` was missing. It was created locally from `TEST-LOGINS.md` and is gitignored. Do not commit it.
- After the browsers installed, the first suite run was **5 failed, 237 did not run.** Every role died in `tests/setup/auth.setup.ts` waiting for a Password label. `/auth` opens on an email code. The harness now clicks "Use password instead" after the role is chosen.
- Re-run with that fix, 2026-09-26, 7.3 minutes: **207 passed, 35 failed.** Sign-in setup passed for all five roles. Failures cluster as:
  - Serious color-contrast on `/`, `/auth`, `/pricing`, `/home`, `/identity`, `/settings`, `/discover`, and the enterprise dashboard (desktop and some mobile). No critical violations in the sampled failures.
  - Logged-out `/home` stays on `/home`. Guest browse is intentional. The access-control test still expects a redirect to `/auth`.
  - Throttled-mobile first contentful paint on `/` and `/home` is over the suite's 1.8s line. The test file already calls this a known gap.
  - WebKit performance tests call `browserContext.newCDPSession`, which Playwright only provides in Chromium, so those four fail by harness, not by the page.
  - Mobile golden path: the talent name is in the page but hidden (a truncated sidebar label), so "Aarav Sharma" is not visible. `/terms` and `/onboarding` on WebKit report a Sentry ingest 403. The key is not copied here.
- Enterprise path, checked after that with the company-admin demo account: password sign-in returned 200 and did not show a 2FA step. `/enterprise/admin` loaded "Admin dashboard" from `GET /api/v1/enterprise/admin/dashboard` (200). `/enterprise/talent` loaded "Every talent. One search." from `GET /api/v1/enterprise/talent/search` (200). `/enterprise/postings` loaded "Postings" from `GET /api/v1/enterprise/postings` (200). Waiting for `DOMContentLoaded` on talent exceeded 30s; the page itself was up and calling the real API.
- Backend: 17 test classes, 71 tests. The last Surefire reports on disk show 0 failures and 0 errors, including `PostJoinSafetyTest` from the attendance commit. This session did not re-run `./mvnw test`.
- Do not treat old frontend "suite is green" notes in other markdown files as current.

## 12. Docs drift

| File | Problem |
|---|---|
| `ROUTES.md` | Says `/home` is unfinished, forgot-password does not exist, `/messages` should redirect to `/inbox`, profile should be `/me`. Live app uses `/home`, `/rooms`, `/identity`. |
| `PRODUCT_BIBLE.md` | Says the visual system is ivory/champagne/gold and that production `GET /feed` 500s because the API was not deployed. Feed returned 200 today. Theme tokens are dark. |
| `GROUND-TRUTH.md` | Hosting facts (Vercel + Railway `arena-staging`) still match. Commit hashes and the "feed 500" era do not. Enterprise 2FA was reported clear on 2026-09-12 for `demo.enterprise@vikisol.dev`. Not re-checked today. |
| `docs/ARENA-FLOW-AND-MOBILE-REVIEW.md` | Accurate bug list (past activity times, onboarding consent defaults, orb, cookie banner, build stamp). Not implemented. |
| No `ARENA-VNEXT-BLUEPRINT.md` | The Track 2 blueprint was not in the repo. Phase 3 has to write it. |

## Working / Partial / Broken / Missing / Must preserve / Must delete

**Working**

- Sign-in exists (email OTP, Google, phone) and guest browse works.
- Home feed with real and clearly badged demo posts.
- Create activity / need / update.
- Nearby map with an honest empty state.
- Work job list and company names.
- Discuss shell.
- Rooms, applications, marketplace, enterprise workspace, platform admin (present in code; enterprise not re-walked today).
- Jenny gateway with approval-gated actions.
- Deploy matches git on both services.

**Partial**

- Work means jobs, not outcomes.
- Discover means job swipe.
- Map means activities only.
- Jenny is a bar and a page, not ambient.
- Profile is identity, not a record of outcomes.
- Attendance exists in the database; it is not the profile story yet.
- Direct-message threads still open on `/messages/[id]` while the list lives on `/rooms`.
- Onboarding still treats explorers like job seekers (see the mobile review; not re-tested in the browser this session).

**Broken or visibly wrong (do not redesign to hide these)**

- Cookie banner covers the tab bar.
- Orb and build stamp collide with the tab bar.
- An activity can be created in the past and show as expired (`ARENA-FLOW-AND-MOBILE-REVIEW.md` §1.1). Not re-confirmed with a new post this session; the code path is still there (`datetime-local` without `min`, server stores any `startsAt`).
- Home and Work spend their first second on a blank loader.
- "New community" label clips on a narrow width ("New co…").

**Missing for the target product**

- Feed as the named front door with a reason to open Arena when you are not job hunting.
- Discover for people and work, separate from the job swipe.
- Map of needs and people, not only activities.
- Work as engagements and outcomes.
- One create flow that can also start a project without sending the person into a different product area.
- A written VNext blueprint in the repo.

**Must preserve**

- Dark/orange brand.
- Post types `ACTIVITY` / `ASK` / `UPDATE` / `COMPANY`, and the room that opens from a joinable post.
- Demo badge. Never remove it to make the network look busier.
- Guest read access.
- Jenny service-token boundary. No database credentials for Jenny.
- Join, leave, and attendance.
- Separate enterprise authorization.

**Must delete later (Phase 2, after this audit is accepted as the baseline)**

- Docs that contradict this file, moved to `docs/archive/` rather than edited into a third story.
- Confirmed-unused components: `IntentCardView.tsx`, `CareerHealthGauge.tsx`, `HealthOrbScene.tsx` (only used by the gauge), `SkillRadar.tsx`. `MessagesInbox` stays; enterprise still uses it.
- Stale comments that still mention `CandidateAppShell`. The ivory token names now point at dark values on purpose; do not delete the token file.

## Access

Recorded in `docs/ACCESS-NEEDED.md`.

## 13. Addendum from the code pass

These points were confirmed in the frontend and backend source after the first draft of this file.

**API mode.** `isRealMode()` is true only when `NEXT_PUBLIC_API_MODE=real`. The code default is a localStorage mock. Production is on the real backend: this session's guest Home showed live posts, and `GET /api/v1/feed` on `api-arena.vikisol.in` returned 200. A local `next dev` without that env var will look populated and still be fake. Do not treat a local mock session as production.

**Create.** The + sheet has four rows: activity, need, project or job, update. Activity, need, and update have forms. "A project or job" has no form; it sends the person to `/marketplace?post=1`.

**Routes with no auth guard in the page.** `/discover`, `/feed/[id]`, `/people/[id]`, and `/onboarding` do not call `allowGuestBrowsing` or `requireOnboarded`. `/enterprise/admin/consent` relies on the shell alone. Bare `/jobs` and `/people` have no page and no redirect, so they 404 while the Work tab treats `/jobs` as part of its section.

**Feed and map scale.** Ranking runs in Java over the newest 500 open posts. Proximity in the general feed is hardcoded to 0. Nearby loads those same 500 rows and computes distance in memory. There is no spatial index. A busy city can hide a nearby activity that is older than that window. Attendance (`ATTENDED` / `NO_SHOW`) is stored and the person is notified. Nothing reads it back into a profile, a rank, or a future join.

**Chat.** Rooms and direct messages are REST polling. There is no WebSocket in the backend.

**Tests still open.** Playwright browsers were still downloading when this addendum was written. The first suite run failed because the browser binary was missing (5 setup tests failed, 237 did not run). That is an environment failure, not an app failure.

## What this audit refuses to do yet

No screen was redesigned. No production flag, DNS record, or database row was changed. Vikisol One was not opened. The demo password was removed from the GitHub Actions comment only.
