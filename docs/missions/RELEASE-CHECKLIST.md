# Release checklist — Arena B+, real backend

**Status: FE RELEASE CANDIDATE READY.** Current as of MARATHON-FE-2 (2–6 Oct 2026, Steps 0 → D).
Supersedes every earlier version of this file — the "Step 8 not attempted" / "full area 7 and 8
not re-verified" caveats from the original `MARATHON-FE` run are resolved; see below.

## Branch
`feature/arena-vnext-mobile-jenny` → `main` (frontend `Vikisol-Arena-FE`). Every commit this run
pushed successfully. **Never merged to main** — per the mission's own standing rule, that decision
is the architect's/founder's, not this run's.

## Vercel Production env vars (when the architect says release-ready and the founder gives the OK)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_ARENA_DATA` | `api` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-arena.vikisol.in/api/v1` |

No other variable changes behavior now — `isRealMode()`/`FIXTURES_ALLOWED`/mock mode no longer
exist at all (Step C removed them entirely; "api" is the only data mode). Google Sign-In/Maps
keys are independent and already documented in `.env.local.example`. The backend goes first,
then the frontend, per the inbox's release rule.

## What works end to end, verified live against the real local backend this run
- **Auth & onboarding:** sign up (DOB collected, backend-enforced 18+), sign in, refresh, sign
  out, the age gate's DOB-skip, full onboarding persistence.
- **Profile & account:** visibility (hidden → "not available" to others, confirmed with two real
  accounts), notification preferences (now fires exactly one save per toggle — was firing two and
  showing a false error, fixed this run), report, block/unblock, export, delete, edit (now opens
  the real editor — was opening a dead legacy screen with no name/bio/photo fields, fixed this
  run), share.
- **Activities:** full `/activities/*` lifecycle — create (real kinds, search works for every
  category after a test-stub fix this run surfaced it was never broken in the real app, only in
  the test), structured details, cover upload (real photo and the procedural-card fallback),
  host questions, join with answers, host approve, self/host check-in, attendance, confirm/
  dispute, feedback.
- **Needs & offers:** respond, accept/decline, withdraw, mark completed.
- **Search:** people/skills search calls the real endpoint.
- **Career:** CTC per-application sharing (off by default, now actually reaches the backend —
  was silently dropped on publish, fixed in Step B), resume upload, apply with/without CTC,
  offer accept/decline live-verified through a full company pipeline (screening → interview →
  offer → candidate accepts → Hired), reject with the kind message, withdraw.
- **Company (Arena for Business):** onboarding, domain-email verification (built from nothing in
  Step A — had zero frontend code before this run), post a job (draft when unverified, open once
  verified), applicant list (CTC shown only when included — was never shown at all before Step
  B), screening/interview/offer/Hired, messages, connect requests (built from nothing in Step B —
  had zero frontend code), unlock credits, billing.
- **Admin:** sign-in with real TOTP 2FA; verification queue approve/reject; moderation warn/
  suspend/ban (were "preview-only" placeholders despite the backend already supporting them —
  wired to the real API in Step B); users suspend/restore/force-signout (same gap, same fix);
  disputes raise-and-resolve (same gap, same fix, plus a real wire-field mixup caught before it
  shipped); industries add/activate (built from nothing); audit, feature flags, companies
  (tenants) already worked and were spot-checked against real data.
- **Full independent QA pass (Step D0, 3 rounds, the mission's cap):** 5 bugs found across
  Onboarding/Profile/Account journeys, all fixed or closed as not-a-bug (details in
  `QA-BUGS.md`). 0 open.

## What's deliberately not built yet (by design — no fake data in its place, each screen says so honestly)
- Jenny's v2 features (sentence-to-filters, approval queue, smart match, job-search automation,
  shortlist) — the JennySol v1 gateway doesn't expose them yet; `JENNY_PREVIEW` is permanently
  `false` now that mock/preview mode is gone, so every gated screen shows its own honest
  "can't do this yet" state.
- A general admin content browser, a platform audit log, and an admin team roster — confirmed by
  reading every `/admin/**` controller that no backend endpoint exists for any of the three (not
  another case of an unwired-but-real endpoint, which is what most of this mission's other admin
  gaps turned out to be).
- Server-side profile-photo storage — `CandidateProfile` has no `photoUrl` field anywhere; a
  user's own uploaded photo is device-local only and can't survive a cleared browser or a second
  device. Found via Step D0's QA-3; logged in `API-ISSUES.md`, needs a backend field + endpoint.

## Dummy data: fully removed (Step C)
Mock mode, every `isRealMode()` branch, `src/lib/mock/*`, `src/lib/preview-off/*`,
`src/lib/data/fixtures.ts`/`FIXTURES_ALLOWED`, the three fixture-only `/dev/*` account-preview
pages, the people/photo fixtures in `public/fixtures/`, and the mock Playwright suite are all
gone. `grep -rn "lib/mock\|preview-off\|fixtures\|isRealMode\|FIXTURES_ALLOWED" src` returns
nothing. Three real, user-facing bugs were caught in the removal itself (a hardcoded sample
profile shown to every new user on Edit Profile, hardcoded fake numbers on the admin overview
page, a fake periodic "agent activity" animation running in every real build) — see
`REPORTS.md`'s Step C entry for the full account.

## Open `API-ISSUES.md` entries
**6 open, all backend-owned, none frontend-blocking:**
1. No server-side profile-photo storage (see above) — needs a backend field + endpoint.
2. No employer-side GET for "my connect status with one candidate" — minor UX rougher edge, not
   broken (the idempotent POST reveals the real status on retry, verified live).
3. `GET /connect-requests` never includes `conversationId` for accepted rows — FE falls back to
   the general inbox instead of a dead deep link.
4. No backend endpoint for admin content browser / audit log / admin team (see above).
5. `GET /admin/users` never includes account status in the list — FE can't show who's suspended
   without opening each profile individually; the actions themselves all work.
6. `PUT /notifications/preferences`'s 409 conflict message text doesn't fit a boolean-preference
   endpoint — cosmetic, surfaced by a frontend bug (now fixed) that doesn't reach it anymore.

## Verified this run (every step)
`npx tsc --noEmit`, full-tree `eslint`, and
`VERCEL_ENV=production NEXT_PUBLIC_ARENA_DATA=api NEXT_PUBLIC_API_BASE_URL=https://api-arena.vikisol.in/api/v1 npx next build`
all green after every commit. **Full local suite run as one pass at the end of Step D: 420
passed, 2 skipped, 0 failed, across all three browser projects** — every failure that existed at
the start of this run (8 of them, flagged honestly as pre-existing and out-of-scope in Step C's
and Step D0's own reports) was investigated and fixed rather than left as a known gap, since Step
D is exactly the point to stop deferring them.

## Draft PR
Not opened this run (never asked for, and the mission's standing rule is never to merge to
`main` without the architect/founder's explicit say). Every commit is on
`feature/arena-vnext-mobile-jenny`, pushed. **Next step, when the architect is ready:** open a
draft PR `feature/arena-vnext-mobile-jenny` → `main`, listing this file and `REPORTS.md`'s Step
0 → D entries as the review starting point.
