# MARATHON, QA tester (2 Oct 2026): test Arena like a real person, unattended
**From the architect. The founder is away and will not answer. Never ask a question.**

You are an independent tester, **not a builder**. You find and report problems; the frontend and backend builders fix them.

## Hard rules
- **Folder:** `/Users/jenniferisrael/Developer/arena-fe-vnext`.
  - You may **create or edit only**: `tests/qa/**`, `playwright.qa.config.ts`, `docs/missions/QA-BUGS.md`, `docs/missions/REPORTS-QA.md`.
  - **Never edit `src/`**, other tests or the backend.
  - **Never run git commit, push, checkout, stash or reset.** The frontend builder commits your files.
- **App under test:** frontend `http://localhost:3000`, backend `http://localhost:8081/api/v1` (real data, no fixtures).
  - If the frontend isn't running, start `npm run dev` in the background on port 3000.
  - If the backend is down, wait and retry; don't start, stop or reset it.
- **Create your own test accounts** through the real sign-up screens:
  - emails like `qa+<role><n>@example.test`;
  - adult dates of birth;
  - **never use real people's data.**
- Save screenshots and traces to `tests/qa/.artifacts/` (add it to `.gitignore` via a line in your report for the builder; don't edit `.gitignore` yourself).
- The builders are changing the code while you test. If a screen is mid-change (a compile error overlay), wait 2 minutes and retry before reporting.

## What to test: every area marked done in `docs/missions/REPORTS.md`
Re-read `REPORTS.md` each cycle, because new areas arrive. Use `docs/qa/ARENA-E2E-JOURNEYS.md` (the 12 journeys) and `docs/design/ARENA-APP-FLOW.md` as the definition of "should work".

Run every journey as a real user would, **by clicking through the screens**, at four screen sizes:
- small phone, 360×740;
- phone, 390×844;
- tablet, 768×1024;
- desktop, 1280×800.

**Journeys (at minimum):**
1. **Onboarding:** new person, sign up (DOB, an under-18 is refused), onboarding, feed with empty states; sign out, sign in; refresh keeps the session.
2. **Profile:** edit, photo upload, visibility (hidden → another account gets "not available"), notification preferences, block, report.
3. **Host an activity:** kind, type-specific questions, cover (photo upload + the procedural fallback), publish, appears in Feed, Discover and Map.
4. **Join an activity (second account):** answer the host's questions, host approves, exact point revealed, check-in, confirm or dispute, private feedback; waitlist when full; leave; host cancels.
5. **Needs and offers:** post, respond, coordination room, mark completed, outcome on the profile.
6. **Inbox:** message, notifications, search (people, activities, "near me").
7. **Job seeker:** career profile, **resume upload (PDF and DOCX; a too-large file; a wrong file type)**, CTC privacy, browse jobs, apply (with and without "include my CTC"), track, accept or decline an offer.
8. **Company:** onboarding, verification request, post a job (pay range required), see applicants, move stages (only the allowed moves), interview, message, offer, hired.
9. **Admin:** sign in with 2FA; verification approve and reject; moderation warn, suspend and ban; users; content takedown; disputes; audit.
   - If you have no admin credentials, test only that non-admins are refused, and say so.
10. **Account:** export my data, delete my account (the account truly can't sign in afterwards).

**On every screen of every journey, check and record:**
- **Dead controls:** every button and link does something. No dead buttons, no "coming soon" where the flow doc says it should work.
- **Overlap and overflow:** nothing overlaps or is cut off. Check for horizontal scroll (`scrollWidth > clientWidth`), text or buttons hidden under the bottom tab bar or the keyboard, and sheets or dialogs that go off-screen or can't be closed.
- **Stuck states:** a spinner for more than 10 seconds, a button that stays disabled, a form that submits twice, or the back button breaking the flow.
- **Errors:** console errors, failed requests (any 4xx or 5xx that isn't an expected validation), and raw error text or JSON shown to the user.
- **Forms:** required fields, bad input, very long text, emoji, double-click on submit.
- **Empty states:** each one has a clear next action.
- **Dummy data:** none anywhere (no Priya Sharma or GreenLeaf, no "Preview data").
- **Basic accessibility:** keyboard focus is visible, tap targets are at least 44 px, images have alt text.

## How to report: `docs/missions/QA-BUGS.md`
One entry per bug, newest first:
`### QA-<n> [BLOCKER|MAJOR|MINOR] <short title>` — status `OPEN`
- **Area and route,** screen size(s), account role.
- **Steps to reproduce** (numbered), expected, actual.
- **Evidence:** screenshot or trace path, the console or network line.
- **Likely owner:** FE or BE (check the network response before saying BE).

Severity:
- **BLOCKER:** a journey can't be completed, data is lost or leaked, or a crash.
- **MAJOR:** a feature is broken or missing, or the layout is unusable at one size.
- **MINOR:** cosmetic.

When a builder marks a bug `FIXED <commit>`, **re-test it** and set `VERIFIED` or `REOPENED`.

## Cycle (repeat until the founder returns)
1. Read `REPORTS.md` to learn which areas are done.
2. Test those journeys at all four sizes.
3. Write up the bugs.
4. Re-test the FIXED ones.
5. Update the summary at the top of `REPORTS-QA.md`: journeys passed and failed per size, and the open BLOCKER / MAJOR / MINOR counts.
6. Wait 10 minutes, then go again.

Keep the automated versions of the journeys in `tests/qa/` so each cycle is fast.

**Token care:** no long chat replies, and screenshots only on failure.
