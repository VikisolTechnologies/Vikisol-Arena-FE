# Arena redesign: handoff (read this first)

Last updated: 9 Oct 2026. Written so a new agent session can continue without re-reading the codebase.

## What is happening

Syam (founder) is redesigning Arena **page by page** to mockups he supplies as images. For each page
he sends the mockup, the page is built to match it, and it is released to production so he can check
it on his phone. This is a founder-directed change of look. It **overrides "the design is final"**
in `CLAUDE.md` for the pages listed here; everything else in the app stays on the B+ design until
its turn comes.

How he works: he wants the screen to look **exactly** like the mockup, he checks on the live site,
and he does not want to be handed prompts or asked to do steps. Functionality gaps are acceptable
for now if the look is right, but they must be reported plainly, never hidden.

## Where things are

| | Frontend | Backend |
|---|---|---|
| GitHub | `VikisolTechnologies/Vikisol-Arena-FE` | `VikisolTechnologies/Vikisol-Arena-BE` |
| Stack | Next.js 16 App Router, TypeScript, Tailwind v4 | Spring Boot 3.3, Java 21 |
| Hosting | Vercel, project `arena-web`. `main` = production (`arena.vikisol.in`). Every other branch gets a preview URL. | Railway (`arena-api`), reached same-origin as `/api/v1` |
| Proof of what is live | `https://arena.vikisol.in/version` returns the commit | |

- Read `AGENTS.md`: this Next.js version differs from older ones; check `node_modules/next/dist/docs/` before using an API you are unsure of.
- Never touch Vikisol One / HRLMS. Never commit secrets. No backend changes as part of a page redesign.

## Status of pages

| Page | Route | Status |
|---|---|---|
| **One entry: sign in or join** | `/auth?mode=signin` (and `mode=signup`) | **Done, live.** One screen for everyone; see "One entry" below. |
| Account recovery | `/auth?mode=recover` | **Done, live.** Reached from "Get help". |
| Welcome / entrance | `/auth` (no mode) | **On hold.** Needs a real looping forest video from Syam (Envato). Do not fake it with CSS zoom. Still the old B+ `WelcomeView`; its two buttons both open the one-entry screen. |
| Company sign-up | `/auth?mode=signup&as=company` | Old B+ `SignUpView`, unchanged. |
| **Feed (home)** | `/home` | **Done.** `components/arena/ArenaShell.tsx` (new app frame), `components/arena/FeedCard.tsx`, `components/screens/FeedScreen.tsx`. See "App shell and feed" below. |
| Create | the (+) sheet | **Done.** `create/CreateSheet.tsx`: "Create on Arena" with six coloured tiles, each opening its existing flow. The mockup's inline title/description/Post form is not built (each kind has its own multi-step flow with validation). |
| Chats | `/rooms` | **Done.** `inbox/InboxScreen.tsx`: segmented All / Messages / Groups (Messages = one-to-one chats, Groups = chats that come with an activity or need), cream list. The chat thread screens themselves are not restyled. |
| Job detail | `/jobs/[id]` | **Done.** `career/JobDetailScreen.tsx`: dark header (Job label, title, company, fact pills), cream sheet with About / People / Reviews, Apply pinned underneath, Share. |
| Discover map | `/discover?view=map`, `/map` | **Done (light touch).** `screens/DiscoverMap.tsx`: radius chip on the map and a "Nearby (N km)" list with thumbnails, type labels, time, place and going. Map, filters and slider logic unchanged. |
| Discover list, activity / need / offer detail, chat threads | `/discover`, `/feed/[id]`, `/rooms/[id]`, `/messages/[id]` | **Not restyled** (old B+ look, in the new frame on desktop). |
| Suggested people, Personalize your feed | | In mockups but **not built**: no suggestions endpoint, and no fake people. |
| Forgot password by email | `/auth/forgot` | **Done, live** (`login/ForgotEmailScreen.tsx`). |
| Set new password from the emailed link | `/auth/reset/[token]` | Not restyled. Still B+ `ResetPasswordView` in `PasswordRecovery.tsx`. Works. |
| Everything after login | | Not started. Palette for the app interior is **undecided**; ask Syam before restyling any of it. |

## The new look (login family)

All of it lives in `src/components/login/` and is **scoped under the `.arena-login` class**. Do not
move these tokens into global CSS until Syam decides the app-wide palette.

- `login.css`: every style and token. Orange `#FF5A1F` (one orange only), warm white text
  `#F7F4EF`, glass card `rgba(18,15,13,0.62)` + `backdrop-filter: blur(24px)`, warm orange border glow.
- Fonts: Playfair Display 700 for headings (self-hosted in `login/fonts/`, loaded only here with
  `next/font/local`; `next/font/google` has broken builds in this repo), Inter for everything else.
- `LoginBackground.tsx`: golden-hour hillside. Posters in `public/login/` (phone and desktop
  crops). Pass a `video` prop later and it fades a looping clip in over the poster.
  The posters were upscaled from a small image Syam sent; a larger original is a straight file swap.
- `LoginScreen.tsx`: `LoginFrame` (background, back button, Skip, logo, footer line) and the
  sign-in screen. **Reuse `LoginFrame` for the next pages in this family** (sign up, forgot).
- `LoginCard.tsx`: the glass card and all sign-in states. Exports `Cta`, `FieldError`, `OtpBoxes`,
  `IndiaFlag` for reuse.
- `RecoveryScreen.tsx`: the recovery flow.
- `flags.ts`: which methods show, and the help address.
- Wired in `src/components/entry/AuthFlow.tsx` (the only shared file touched): `mode=signin` and
  `mode=recover`.

Class naming: everything is `al-*`. Entrance animation is the `.al-in` class with `--i` for order;
it is CSS only (no GSAP/Framer on this route) and switches off for reduced motion.

## App shell and feed (signed-in app)

- **`ArenaShell`** is the new frame for redesigned in-app pages. Phone: top bar (logo, search,
  chats with unread count, notifications, you) and the bottom bar Feed · Discover · (+) · Chats ·
  You. From 1024px: left sidebar, top search bar with a Create button, and an optional right rail
  (`aside` prop, shown from 1280px). The page turns cream on desktop through a media query in
  `arena.css` that sets the same token values as `[data-tone="light"]`.
- It uses the existing **B+ tokens** (`bg-paper`, `text-paper-ink`, `bg-primary` ...). It is not
  the login family's `al-*` styling and adds no palette.
- The old `bplus/AppShell` is still used by every other page (about 40). It now shares the frame:
  the same bottom bar on a phone, and from 1024px the same sidebar and top bar (`ArenaSidebar`,
  `ArenaTopBar` exported from `ArenaShell.tsx`). Those screens **stay graphite on desktop**: their
  colours fail contrast on a cream page (tested), so only `ArenaShell` screens turn cream. Move a
  screen from `AppShell` to `ArenaShell` when it is restyled, and check contrast when you do.
- **Feed:** kind filter row (All, Activities, Jobs, Needs, Offers) and, behind the Filters button
  on the location bar, the where-and-when filter (Anywhere, Nearby, This week). Cards show author,
  kind label, cover, title, place, time, going, and Like / Comment / Share. Like uses the existing
  react/unreact calls; Share uses the device share sheet or copies the link.
- **Right rail** uses only real data: count of posts within 5 km (links to `/map`), upcoming
  activities, and the person's chats. The mockup's mini map with pins, attendee faces and
  "Suggested people" are not built (no data for them). The "..." menu on cards has Copy link and
  Open post; report and block stay on the post's own screen.
- White text on Arena orange fails contrast at small sizes, so text-on-orange uses
  `bg-primary-on-paper` (the deeper orange). Icon-only orange buttons keep `bg-primary`.
- Pre-existing failing tests, not caused by this work (they fail on the code from before it too):
  `core.local.ts` "Work, You and Jenny render honest states", `projects.local.ts` "collaborative
  project stays a draft", `business.local.ts` "desktop board: drag a card to Interview".

## Two tones

- **`tone="dusk"` (the default on `LoginFrame`, used everywhere now):** Syam found the orange look
  "too orange" and supplied a cooler one. Dusk keeps orange for the logo, accent words, links and selected chips
  only; buttons are slate glass, the background is desaturated and cooled with a CSS filter (same
  image; no new artwork exists yet). All rules are at the end of `login.css` under
  `.arena-login[data-tone="dusk"]`.
- **`tone="warm"`:** the earlier orange look, still available, used nowhere.

## One entry (founder decision, 9 Oct 2026)

Syam dropped separate sign-up and sign-in ("we are making the process so complicated"). There is
one screen, "Welcome back", with Mobile and Email tabs. The person enters a number or an email and
Arena works out the rest. All of it is `LoginCard.tsx`.

| Entered | Account exists | New person |
|---|---|---|
| Mobile | sign-in OTP → verify → home | sign-up OTP → verify creates the account → home |
| Email | sign-in code emailed → verify → home, or "Use password instead" | one short form (name, password, date of birth) → `signUp` → home |

- There is no "does this account exist" endpoint. **Asking arena-api for the sign-in code is the
  check**: it answers "No account found ..." for a new person, and the card branches on that text
  (`NO_ACCOUNT` regex). If the backend wording changes, update the regex.
- New email people still fill three fields because arena-api's sign-up requires name, password and
  date of birth (18+) and has no code-based email sign-up. Truly automatic creation needs a backend
  change (an email sign-up OTP endpoint); do not fake it with generated passwords.
- New mobile accounts are created with the name "Arena member" (arena-api requires a name at
  verification); the existing in-app date-of-birth prompt covers their birthday.
- Nobody is sent to `/onboarding` from this screen any more. The page still exists.
- A multi-step sign-up (`SignupFlow.tsx`: photo, location, interests, details, review) was built
  and then removed at Syam's request; it is in git history at commit `2b04d63` if wanted again.

## Known gaps (accepted by Syam for now; do not "fix" silently)

| Gap | Why | What unblocks it |
|---|---|---|
| Mobile OTP never delivers a code | arena-api has no SMS sender (MSG91 keys empty) | Syam is setting up MSG91 + DLT. No frontend change needed after. |
| Mobile OTP only works for accounts that already have a verified phone | `requestPhoneSigninOtp` rejects others with "No account found for this phone number" | Product decision / backend |
| Recovery depends on the same OTP | It reuses the phone sign-in OTP; a correct code signs the person in | Same as above |
| Apple and WhatsApp icons | No sign-in endpoint in arena-api. They show "isn't available yet" when tapped | Backend + Apple Developer account |
| `Keep me signed in` does nothing | Sessions always persist; there is no session-only mode | Backend/auth change |
| "username" in recovery copy | Arena has no usernames; the wording follows the mockup | Copy decision |
| Logo is the outlined `ArenaMark`, mockup shows a flat "A" | No flat SVG exists | Syam supplies an SVG |

`NEXT_PUBLIC_LOGIN_MOBILE_OTP=0` hides the Mobile tab and opens on Email, if Syam wants that
until SMS works.

## How to build the next page (cheap in tokens)

1. Look at Syam's mockup. Read only: this file, `src/components/login/` and the one existing
   component the page replaces (e.g. `SignUpView` in `src/components/entry/AuthForms.tsx`).
2. Build new components in `src/components/login/` using `LoginFrame` and the `al-*` classes. Keep
   every existing auth call, validation message and redirect.
3. Keep the ids and labels existing tests use (`#signin-email`, `#signin-password`, label
   "Email address", "Password", button "Show the characters").
4. Check: `npx tsc --noEmit`, `npx eslint <changed paths>`, then
   `npx playwright test -c playwright.local.config.ts tests/local/entry-journey.local.ts`
   (builds and runs against a stubbed API; no real accounts needed).
5. Screenshot at 390, 768 and 1440 wide and compare with the mockup before releasing.
6. Release: push the branch (Vercel preview), then fast-forward `main` when Syam has asked for it
   live. Confirm with `/version`. Tell him what is live and list any gaps.

## Two agents at once

- One page per agent, one branch per page (`feature/redesign-<page>`), branched from current `main`.
- Only one agent edits `src/components/login/login.css`, `LoginScreen.tsx` and `AuthFlow.tsx` at a
  time. If both need them, the second one rebases on `main` after the first has merged.
- `git pull --rebase origin main` before starting and before merging. Small merges, often.
- Add a line to "Status of pages" above when a page starts and when it ships.
- A Cursor session on Syam's laptop built its own login on a local `feature/login-redesign`
  branch (never pushed). It is superseded by what is on `main`; those local changes should be
  discarded, not merged.
