# QA bugs
One entry per bug, newest first. Format per `docs/missions/MARATHON-QA.md`.

### QA-3 [MAJOR] Profile's own "Edit" button opens a dead, wrong-design legacy editor with no way to change name/bio/photo/interests — status FIXED (partial, one sub-issue logged as a real gap)
- **Fix:** `src/components/screens/ProfileScreen.tsx` — the main "Edit" button next to the avatar
  now links to `/account/edit` (the real, maintained editor) instead of `/identity/edit`.
  `/identity/edit`'s skills force-graph and resume upload are genuinely different functionality
  with no equivalent at `/account/edit`, so rather than retire the whole screen, added a small
  "Edit" link next to the Skills row in the About tab pointing there — it stays reachable, just
  no longer the thing the primary Edit button opens. The `picsum.photos` hardcoded cover on
  `/identity/edit` wasn't touched (out of scope for this specific bug; that screen's own cover
  image is a separate, smaller issue from the navigation bug being fixed here).
- **Not fixed, logged as a real gap (not attempted - needs a backend field, not a frontend fix):**
  `ProfileScreen`'s avatar, and `/account/edit`'s own `PhotoPicker`, both only ever read/write
  the device-local onboarding draft (`draft.photo`, localStorage) — confirmed by reading both
  files: `CandidateProfile` (`src/lib/types.ts`) has no `photoUrl` field at all, and
  `/account/edit`'s own page header already says as much ("Area and photo upload use existing
  calls where available" - photo isn't one of them). There is currently no real, server-side
  profile-photo storage anywhere in this app for any account; a user's own photo genuinely
  cannot survive a cleared browser or a second device today. This needs a backend
  `CandidateProfile.photoUrl` field (or similar) plus a real upload endpoint before the frontend
  can fix it - flagging for `API-ISSUES.md` rather than claiming a frontend-only fix that doesn't
  exist.
- **Area and route:** `/identity` -> `/identity/edit`, confirmed live at desktop (1280x800) and
  small phone (360x740), signed-in account (no special role).
- **Steps to reproduce:**
  1. Sign up, complete onboarding, land on `/identity` (the "You" tab / Profile screen).
  2. Click the "Edit" button next to your avatar (`href="/identity/edit"`,
     `src/components/screens/ProfileScreen.tsx` line 117).
  3. Compare what loads against Settings -> "Edit profile" (`/account/edit`), which is the real,
     currently-maintained editor (name, bio, photo via `PhotoPicker`, interests, availability -
     `src/app/account/edit/page.tsx`).
- **Expected:** the profile screen's own "Edit" button opens the real editor (same place Settings
  links to), including a way to change your profile photo after onboarding.
- **Actual:** it opens `src/app/identity/edit/page.tsx` - a completely different, older design
  system (`@/components/app/AppShell` + shadcn `Card`/`Button`, a vertical desktop nav list
  "Home / Nearby / Discuss / Work / Inbox / Saved / Notifications / Profile" instead of the B+
  bottom-tab chrome used everywhere else in the app). That screen can only edit **skills** (a
  force-graph picker) and the **resume**; there is no field anywhere on it for name, bio, photo
  or interests. Its cover photo is a hardcoded `picsum.photos` placeholder
  (`https://picsum.photos/seed/${profile.id}-cover/...`), not a real upload. Confirmed live:
  signed up a fresh account, clicked Edit from `/identity`, landed on `/identity/edit`, page body
  only offered "Edit skills" / "Resume" / "Activity" tabs - no name/bio/photo controls at all.
  Separately, `ProfileScreen.tsx` itself only ever renders the **locally-cached onboarding draft**
  photo (`draft.photo`, device-only `localStorage`) as the avatar, never a server-side
  `profile.photoUrl` - so on a second device, or after clearing site data, a user who uploaded a
  profile photo at sign-up sees their own avatar fall back to initials, with no visible way from
  the main Profile screen to fix it (the real photo editor only exists at `/account/edit`,
  reachable today only via Settings, not from Profile's own Edit button).
- **Evidence:** live repro this cycle (fresh QA account, Playwright); no overflow at either size
  (`identity/edit`'s own `scrollWidth`-`clientWidth` was 0 at 360px), so this is a navigation/
  wiring bug, not a layout bug. No console errors on the page itself.
- **Likely owner:** FE - either repoint `ProfileScreen.tsx`'s Edit button at `/account/edit` and
  retire `src/app/identity/edit/page.tsx`, or merge that screen's skills/resume/activity panels
  into the real editor and delete the dead one. Also worth deciding whether `CandidateProfile`
  should carry a server `photoUrl` that `ProfileScreen`'s `Avatar` reads as a fallback when there's
  no local draft.

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
