# QA reports (newest first)

## Summary (as of this cycle — 6 Oct 2026, cycle 2)
**Journeys tested so far:** 2 of 12 (Onboarding, Profile), full click-through + automated.
Profile was tested primarily at desktop (1280x800) and small phone (360x740) this cycle; the
backend's own rate limiter (noted in cycle 1) kicked in partway through the phone/tablet
automated runs after repeated manual + automated sign-ups and blocked finishing all four sizes
for Journey 2 — the functional findings below were confirmed live before that happened, and the
automated `profile.qa.ts` passed cleanly on `phone` once the limiter cooled down. The other 9
journeys (Host, Join, Needs/offers, Inbox, Job seeker, Company, Admin, Account, plus Discover/Map)
are **not yet tested**.

**Journeys passed per size** (small phone 360x740 / phone 390x844 / tablet 768x1024 / desktop
1280x800):
- Journey 1 (Onboarding): **PASS / PASS / PASS / PASS** (re-ran clean this cycle too) — sign up,
  under-18 refused, adult sign-up, onboarding to completion, feed empty state, refresh keeps
  session, sign out, wrong password rejected cleanly, sign back in.
- Journey 2 (Profile): **PASS / PASS / rate-limited (not re-run) / PASS**, with one MAJOR bug
  found (QA-3) at every size it ran: the profile screen's own "Edit" button opens a dead legacy
  editor, not the real one. Visibility (hidden -> "This profile isn't available" for another
  account) passed cleanly. Photo upload, notification preferences, block and report were **not**
  exercised this cycle (budget went to the Edit-navigation bug once it surfaced) — next up.

**Open bug counts:** 0 BLOCKER, 1 MAJOR, 2 MINOR (see docs/missions/QA-BUGS.md).

**For the frontend builder:** add `tests/qa/.artifacts/` to `.gitignore` — it holds Playwright
screenshots/traces from this suite and shouldn't be committed.

---

## Cycle 2 — 6 Oct 2026
**Re-read `REPORTS.md`.** Per `MARATHON-FE-2`, areas 1-9 are all built out (including company
verification, needs/offers, admin moderation/disputes/industries, Jenny's honest empty states) and
Step C removed all mock-mode/fixture code from the shipped app. Confirmed frontend (3000) and
backend (8081) both already running; didn't touch either. Re-ran Journey 1 (clean, all 4 sizes,
no regressions) then moved to Journey 2 (Profile), the next untested item from cycle 1's list.

**Journey 2 — Profile.** Walked `/identity` (the real "You" screen, `ProfileScreen.tsx`) by hand
first, then followed its own "Edit" button like a real person would.
- **Found QA-3 (MAJOR):** Edit goes to `/identity/edit`, a stale screen built on a completely
  different layout/design system (desktop sidebar nav, shadcn components) with no fields for
  name/bio/photo/interests — only skills and resume. The real, current editor
  (`/account/edit`, with a working `PhotoPicker`) is reachable only via Settings ->
  "Edit profile", not from Profile's own Edit button. A real person clicking the obvious control
  on their own profile cannot change their name, bio, photo or interests from there at all.
  Confirmed live (fresh account, both desktop and small-phone) — no overflow at either size, so
  it's a wiring/dead-link bug, not a layout one. Full repro, evidence and likely owner in
  `docs/missions/QA-BUGS.md` QA-3.
- **Visibility passed:** set "Hidden" in Settings -> Profile visibility, a second fresh account
  opening the first account's public share link (`/people/{id}`) correctly saw "This profile
  isn't available" (not the real details, no raw error). No horizontal overflow on either screen.
- **Not reached this cycle:** photo upload/re-upload after onboarding (folds into QA-3 — there's
  currently no reachable control for it outside onboarding itself), notification preferences,
  block, report. Carrying these into the next cycle.

**Rate limiter, again (not filed as a bug, same as cycle 1's note):** running the manual
exploration plus the automated suite back to back (roughly a dozen sign-ups in under 10 minutes)
tripped "Too many requests. Please wait a moment and try again." on two of the four `profile.qa.ts`
projects. The message itself renders cleanly with no crash — this is the backend's limiter working
as intended under rapid-fire QA testing, not a product bug, but it's now tripped on both cycles.
Worth the next cycle pacing sign-ups further apart, or giving the suite a small built-in delay
between projects, so all four sizes can finish in one run.

**Automated suite:** `tests/qa/profile.qa.ts` added (signs up two real accounts, checks the Edit
link's actual destination, sets Hidden visibility, confirms the second account is refused).
`npx playwright test --config=playwright.qa.config.ts` this cycle: 6/8 passed outright
(onboarding.qa.ts 4/4, profile.qa.ts 2/4), the 2 profile.qa.ts failures both the rate limiter
above (confirmed via each failure's own `error-context.md` showing the exact "Too many requests"
alert, not a different failure); `profile.qa.ts` on `phone` alone passed cleanly on a clean re-run.

---

## Cycle 1 — 6 Oct 2026
**Setup.** No `tests/qa/` existed yet. Created `playwright.qa.config.ts` (four projects for the
four required screen sizes, baseURL http://localhost:3000, no fixtures/stubs - every request
goes to the real local backend at http://localhost:8081/api/v1) and
`tests/qa/onboarding.qa.ts`. Confirmed frontend (port 3000) and backend (port 8081,
/actuator/health) were both already running; didn't start or restart either.

**Journey 1 - Onboarding.** Walked it by hand first (new real accounts,
qa+person<timestamp>@example.test, adult DOB), then encoded the same steps as an automated
Playwright test and ran it on all four sizes.
- **Under-18 refusal:** DOB 2015-01-01 -> client-side message "You must be 18 or older to join
  Arena" shown inline, submit also correctly 400s server-side (expected validation, not logged as
  a bug) and the user stays on the sign-up screen with nothing lost.
- **Adult sign-up -> onboarding -> feed:** full 5-step onboarding completes, lands on /home with
  a clean empty-feed state ("Nothing within 5 km yet" + a working "Create an activity" link + a
  "Widen to 15 km" action) - empty state has a clear next action per the mission's checklist.
- **Refresh keeps the session:** confirmed - reloading /home stays signed in.
- **Sign out -> sign in:** sign out lands on /auth?mode=signin; a wrong password shows "Invalid
  email or password" (no raw error/JSON, no crash); the correct password signs back in to /home.
- **No overlap/overflow** at any of the four sizes (scrollWidth <= clientWidth checked
  programmatically on the sign-up screen and the feed).
- **No dummy data seen** anywhere in this journey (no Priya Sharma, no preview pills) - in fact
  the account's own display name and area selection round-tripped correctly.

**Bugs found:** two MINOR, filed as QA-1 and QA-2 in docs/missions/QA-BUGS.md - the sign-up
form's embedded Terms/Privacy links discard typed fields on back-navigation, and the onboarding
URL's step= number is one behind the on-screen "Step X of 5" label. Neither blocks the journey.

**Noted, not filed as a bug:** running ~15 sign-ups back to back in quick succession (manual
exploration + the automated suite across four projects) tripped the backend's own rate limiter
("Too many requests. Please wait a moment and try again.") on two runs. This is the backend
working as intended under rapid-fire testing, not a product bug - the message itself rendered
cleanly, no raw error. Worth the next cycle pacing sign-ups a little, or the suite may need a
built-in backoff/retry if it keeps happening under normal cadence.

**Not covered this cycle (next up):** Profile, Host an activity, Join an activity, Needs and
offers, Inbox, Job seeker, Company, Admin (no admin credentials created yet - next cycle either
builds one through the real bootstrap path or confirms non-admins are refused, per the mission's
fallback instruction), Account export/delete. Also didn't yet re-run Journey 1 against
Discover/Map or exercise the "Jump to..." command-palette control noticed floating on every
screen (unclear if it's user-facing or a dev-only overlay - worth a quick check next cycle before
treating it as in scope).

**Automated suite:** tests/qa/onboarding.qa.ts, run via
`npx playwright test --config=playwright.qa.config.ts` - 4/4 passing (small-phone, phone, tablet,
desktop) as of this report.
