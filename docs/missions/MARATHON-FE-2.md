# MARATHON-FE-2 (3 Oct 2026): close the gaps to release-ready
**From the architect.** MARATHON-FE is accepted as honest and useful work: 9 commits and real bugs found. This run finishes what it left.

The standing orders in `MARATHON-FE.md` still apply: never ask, commit per step, push once and carry on if it fails, never merge to `main`, never loosen a test, read `QA-BUGS.md` between steps.

## Step 0: push and sync
- Run `git push` now for the 9 local commits. If the network is still down, retry once after each later step. It matters: nothing is backed up until it's pushed.
- The backend now refuses write actions for accounts with no date of birth ("Add your date of birth to continue"). Make sure the frontend shows that message with a link to add it, wherever a write can fail.

## Step A: company verification (missing completely, and it blocks the whole business side)
A company can't publish a job without verification, and the frontend has no code for it.

- **Read:** `BusinessController` (`/enterprise/verification`, `/enterprise/verification/confirm`), the business verification DTOs, and the admin verification endpoints.
- **Build, in B+ per `ARENA-APP-FLOW.md` (business section):**
  1. the company enters its website and work email;
  2. a code is sent to the domain email, and the company enters it;
  3. status "Pending review";
  4. the admin approves or rejects, with a note;
  5. the company sees Verified (badge) or Rejected (with the reason and a retry).
- A job in draft shows "Verify your company to publish" with a link.
- Add a journey test with a company account and the platform admin.

## Step B: verify areas 7 and 8 LIVE, by clicking through with real accounts (not by reading code)
The local database is empty, so **create the data through the app:**
1. Company A: onboard → verify (Step A; the admin approves) → post a job (pay range) → open.
2. Candidate: career profile, resume upload, apply (once with "include my CTC", once without).
3. Company: the applicant list (CTC shown only when included) → screening → interview (schedule; the candidate picks a slot) → offer → **the candidate accepts → Hired**. Also the reject path with the kind message, and withdraw (the application disappears from the company's list).
4. Messages (allowed only after an application or an accepted connect request), connect requests, unlock credits, billing.
5. **Admin** (the platform admin; 2FA): every admin screen against real data:
   - verification queue;
   - moderation (file a report, then warn, suspend, ban; the suspended user can't sign in);
   - users;
   - content takedown;
   - disputes (raise one in an activity, then resolve it);
   - audit and CSV;
   - team;
   - industries (add one, and it appears in the company's picker);
   - flags.

Fix what's broken. Log the real backend mismatches in `API-ISSUES.md`, after checking the controller.

## Step C: remove the dummy data (Step 8 of MARATHON-FE), safely
Do it **one directory at a time**, running typecheck and the api-mode production build after each, and commit each:
1. the `isRealMode()` mock branches in `src/lib/api/*` (then delete `isRealMode` itself);
2. `src/lib/mock/*`;
3. `src/lib/preview-off/*`;
4. `src/lib/data/fixtures.ts` and `FIXTURES_ALLOWED`;
5. the fixture-only `/dev/*` routes;
6. the people fixtures in `public/fixtures/`;
7. the mock Playwright suite (`playwright.mock.config.ts` and its tests): port anything still valuable to the local real-backend suite, then delete the rest.

**Goal:** `grep -rn "lib/mock\|preview-off\|fixtures\|isRealMode\|FIXTURES_ALLOWED" src` returns nothing.

## Step D0: independent QA pass (the founder will not start a separate tester)
Launch a **subagent with fresh context** (the Task tool) whose only instructions are: "Read docs/missions/MARATHON-QA.md and run ONE full cycle. Only test and report; never edit src/; never run git."

When it returns, fix every OPEN **BLOCKER** and **MAJOR** in `QA-BUGS.md` that is a frontend problem (copy the backend ones to `API-ISSUES.md`). Then launch a second fresh QA subagent to re-test. Repeat until no BLOCKER is open, with a maximum of 3 rounds.

## Step D: release candidate
- Run the full local suite, typecheck, lint, and the api-mode production build. All green.
- Update `RELEASE-CHECKLIST.md`.
- Put **"FE RELEASE CANDIDATE READY"** at the top of `REPORTS.md`, or exactly what remains.
