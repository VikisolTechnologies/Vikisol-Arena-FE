# QA reports (newest first)

## Summary (as of this cycle — 6 Oct 2026, cycle 1)
**Journeys tested this cycle:** 1 of 12 (Onboarding), full click-through + automated, at all four
sizes. The other 11 journeys (Profile, Host, Join, Needs/offers, Inbox, Job seeker, Company,
Admin, Account, plus Discover/Map) are **not yet tested** — this was the first cycle, spent
getting a real test account pipeline working end to end against the real backend. They're next.

**Journeys passed per size** (small phone 360x740 / phone 390x844 / tablet 768x1024 / desktop
1280x800):
- Journey 1 (Onboarding): **PASS / PASS / PASS / PASS** — sign up, under-18 refused, adult
  sign-up, onboarding to completion, feed empty state, refresh keeps session, sign out, wrong
  password rejected cleanly, sign back in. No horizontal overflow, no unexpected console errors
  or failed requests at any size.

**Open bug counts:** 0 BLOCKER, 0 MAJOR, 2 MINOR (see docs/missions/QA-BUGS.md).

**For the frontend builder:** add `tests/qa/.artifacts/` to `.gitignore` — it holds Playwright
screenshots/traces from this suite and shouldn't be committed.

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
