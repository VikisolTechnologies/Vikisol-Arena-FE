# QA bugs
One entry per bug, newest first. Format per `docs/missions/MARATHON-QA.md`.

### QA-1 [MINOR] "Terms of Service" / "Privacy Policy" links inside the sign-up agreement checkbox discard the whole form — status FIXED
- **Fix:** `src/components/entry/AuthForms.tsx` — both links now open in a new tab
  (`target="_blank" rel="noopener noreferrer"`) instead of navigating away in the same tab, so the
  sign-up form is never discarded. `tests/qa`'s own repro (fill form → click link → back →
  check `#signup-name`) is the right regression check for next cycle.
- **Area and route:** `/?mode=signup` (sign-up form), all four screen sizes, no account (pre-signup).
- **Steps to reproduce:**
  1. Go to `/?mode=signup`.
  2. Fill in Full name, Email, Password, Date of birth.
  3. Click the "Terms of Service" (or "Privacy Policy") link inside the agreement row instead of the checkbox square itself.
  4. The app navigates to `/terms` in the same tab (no new tab, no confirm dialog).
  5. Click the browser/in-app back control to return to `/?mode=signup`.
- **Expected:** either the links open in a new tab, or the typed sign-up fields are still there on return (or returning restores the step from a saved draft).
- **Actual:** all four fields (name, email, password, DOB) are empty again — the whole form has to be retyped. Confirmed via automated repro: filled the form, clicked the `Terms of Service` link, navigated to `/terms`, pressed back, `#signup-name` value was `""`.
- **Evidence:** repro script output in this cycle's run (`name field value after back: ""`); no screenshot saved (textual repro only, per "screenshots only on failure" token-care rule — will capture one if this persists next cycle).
- **Likely owner:** FE (`src/components/entry/AuthForms.tsx` or wherever the sign-up form lives — the agreement row's links should open in a new tab, or the form should persist its draft across an accidental navigation).

### QA-2 [MINOR] Onboarding URL step number is off by one from the on-screen "Step X of 5" label — status CLOSED (not a bug)
- **Why it's not a bug:** `src/components/entry/onboarding/Onboarding.tsx`'s `step` (line ~51)
  deliberately skips the age-gate step (URL step 1) straight to step 2 when
  `dobSet === true` — i.e. the account already has a date of birth on file (every email
  sign-up collects one at sign-up, per B10). The on-screen "Step X of 5" (screen-reader text in
  `StepperDots`, `src/components/bplus/Controls.tsx`) is driven by that same adjusted `step`
  value, not the raw `?step=` URL param — so `?step=1` correctly shows "Step 2 of 5" for any
  account whose DOB was already collected at sign-up. The QA account from this cycle's run hit
  exactly that case. The flow itself is correct and was already confirmed completing end to end.
