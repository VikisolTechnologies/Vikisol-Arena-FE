# QA bugs
One entry per bug, newest first. Format per `docs/missions/MARATHON-QA.md`.

### QA-5 [MAJOR] Notification preference toggle fires its save PUT twice; the duplicate 409s and shows a false "Couldn't save" error even though the change already saved — status FIXED
- **Fix:** `src/app/account/notifications/page.tsx` — `toggle()` no longer puts the
  `setNotificationPreferences` API call inside the `setPrefs` state updater. It now computes
  `next` directly from the current `prefs`, calls `setPrefs(next)` once, then fires the single
  API call as a plain side effect afterward — the exact same bug-introducing pattern this file
  picked up during MARATHON-FE-2 Step C's isRealMode() removal, now reverted to the standard
  shape.
- **BE note (not this step's to fix, logging for awareness):** the duplicate request's `409`
  body text ("One of the values you entered is already in use elsewhere in the system.") is a
  generic uniqueness-conflict message that doesn't fit a preferences PUT at all - worth a look
  on the backend side independent of this frontend fix, in case some other caller hits the same
  mismatched error copy.
- **Area and route:** `/account/notifications`, confirmed at desktop (1280x800) and small phone
  (360x740), signed-in account (no special role). Affects the "Jenny" and "Marketing" toggles
  (the two `deviceOnly` prefs in `getDefaultNotifPrefs()`, `src/components/account/draft.ts`) —
  not checked whether the other four (Messages/Activities/Needs/Jobs) also double-fire, since
  the bug is in the shared `toggle()` handler, not per-pref.
- **Steps to reproduce:**
  1. Sign up, complete onboarding, go to Settings -> Notification preferences
     (`/account/notifications`).
  2. Click the "Jenny" toggle once.
  3. Watch the network tab (or console) for calls to `PUT /notifications/preferences`.
- **Expected:** one `PUT` request per click; it succeeds; no error shown.
- **Actual:** two identical `PUT /notifications/preferences` requests fire from a single click.
  The first returns `200` with the change correctly applied (`{"jenny":false,...}`). The second,
  duplicate request returns `409 {"success":false,"message":"One of the values you entered is
  already in use elsewhere in the system."}` (a uniqueness-constraint message that makes no
  sense for a boolean preference — looks like the backend's generic conflict handler, not
  anything specific to this endpoint). `NotificationPrefsPage`'s `.catch(() => setError("Couldn't
  save that change — try again."))` fires on that second rejection, so the user sees a save
  failure banner for a change that actually already saved. Root cause (read, not changed):
  `src/app/account/notifications/page.tsx`'s `toggle()` puts the real `setNotificationPreferences`
  API call *inside* the `setPrefs(cur => { ... })` updater function — a side effect inside a
  React state updater, which React (in dev/strict rendering) can invoke more than once, firing
  the real network call twice from one click.
- **Evidence:** live repro this cycle (fresh QA account, Playwright network capture):
  ```
  RESP PUT .../notifications/preferences 200 {"jenny":false,...}
  RESP PUT .../notifications/preferences 409 {"message":"One of the values you entered is
  already in use elsewhere in the system."}
  ```
  then the page's own "Couldn't save that change — try again." text became visible. No
  horizontal overflow at either size.
- **Likely owner:** FE primarily (`src/app/account/notifications/page.tsx` — move the
  `setNotificationPreferences` call out of the `setPrefs` updater into a plain event-handler
  side effect, called once). Separately worth a BE note: that endpoint's `409` body text is a
  generic "already in use" conflict message that doesn't fit a preferences PUT at all — likely
  a shared conflict-handler being hit for the wrong reason; logging for `API-ISSUES.md` rather
  than guessing the backend cause further.

### QA-4 [MAJOR] The cookie-consent banner sits above every bottom sheet and blocks the sheet's primary action button until it's dismissed — status FIXED
- **Fix:** `src/components/bplus/BottomSheet.tsx` — raised its overlay from `z-50` to `z-[950]`,
  matching the exact precedent already established for this same bug class in
  `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx` (ARENA-STABILIZE.md Phase 2,
  G2 - those two were fixed for sitting below `CookieConsentBanner`'s `z-[900]` and
  `BottomTabBar`'s `z-[890]`; this B+ sheet component was evidently missed in that pass).
- **Area and route:** app-wide (every screen that can show both the cookie banner and a
  `BottomSheet`-based dialog before the banner is dismissed); reproduced concretely via
  `/people/[id]` -> Report. Confirmed at desktop (1280x800) and small phone (360x740), signed-in
  account (no special role), fresh browser context (cookie banner only shows pre-dismissal).
- **Steps to reproduce:**
  1. Open the app in a fresh context (cookie banner visible, not yet dismissed/rejected).
  2. Sign up and get to any screen with a `BottomSheet` whose primary button sits near the
     bottom of the viewport — e.g. a profile's "Report" button -> the Report sheet's "Submit
     report" button.
  3. Without dismissing the cookie banner first, click "Submit report" (or any other bottom-sheet
     primary action anchored low in the sheet).
- **Expected:** the sheet's own button is clickable regardless of the cookie banner's presence
  (sheets should render above persistent chrome), or the banner and sheet simply don't overlap.
- **Actual:** the click is swallowed — Playwright's own actionability trace shows `<div
  role="region" aria-label="Cookies" ...>` intercepting the pointer event at that screen position,
  and it retries for the full 90s test timeout without ever landing the click. Confirmed in code,
  not just by the trace: `CookieConsentBanner` (`src/components/CookieConsentBanner.tsx`) is
  `fixed` with `z-[900]`; `BottomSheet` (`src/components/bplus/BottomSheet.tsx` line 105) is
  `fixed inset-0 z-50`. Any bottom-anchored control inside a sheet sits 850 z-index layers below
  the still-showing cookie banner. This isn't specific to Report — it's a stacking-order bug that
  will hit any sheet opened before a new user dismisses the banner (confirm dialogs, Block
  sheet, publish/submit sheets, etc.).
- **Evidence:** live repro this cycle (fresh QA account/context, Playwright): the exact
  interception trace plus the two source files' z-index values (900 vs 50). Workaround confirmed:
  dismissing the cookie banner first (click "OK") makes the same "Submit report" click land
  immediately and the flow completes end to end (verified both sizes).
- **Likely owner:** FE — raise `BottomSheet`'s z-index above the cookie banner's `z-[900]` (or
  give the banner a lower one), `src/components/bplus/BottomSheet.tsx` / 
  `src/components/CookieConsentBanner.tsx`.

### QA-3 [MAJOR] Profile's own "Edit" button opens a dead, wrong-design legacy editor with no way to change name/bio/photo/interests — status VERIFIED FIXED
- **Re-tested this cycle:** confirmed live (Playwright, desktop + small-phone) — `ProfileScreen.tsx`
  line 117's Edit button now has `href="/account/edit"` and a fresh account's Edit click lands on
  the real editor with no errors or overflow at either size. Setting `VERIFIED`.
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
