# M1A visual correction

Commit `1e8bf98` on `feature/arena-vnext-mobile-jenny`. The M1A journey at `d746cf9` stays the foundation. This pass changes presentation only: brand, type, surfaces, entry composition, onboarding options, the privacy card, the ready summary, and the empty feed. Authentication, profile writes, privacy rules, and production infrastructure are unchanged.

Approved references, not embedded in the app:

- Primary system: `exec-f4234256-1e73-4df4-a8ef-7bbbf49e922d.png`
- Entry and onboarding: `exec-e2947398-8c27-451f-b973-1f372c5aed0e.png`
- Jenny layer: `exec-cfca4870-b82e-48bc-b041-fb3b9aa4cc46.png`

Old captures stay in `docs/reviews/m1a/`. Corrected captures are in this folder.

## Comparison

| Screen | Approved reference | Old M1A | Corrected | Remaining difference |
| --- | --- | --- | --- | --- |
| Welcome | Ivory entry, skyline photo, "Local people. Real outcomes.", Join / Sign in / Guest | Orange circle "a", flat black, gradient block, "unknown" stamp | Arena mark and wordmark, editorial title, honest activity/need/work cards, three actions | No approved neighborhood photo exists in the repo, so the board uses editorial cards instead of a picture of people or a skyline. No live counts. |
| Sign in | Branded header, elevated sheet, show/hide, forgot password | Flat fields, separate Show button, stamp | Editorial "Welcome back", graphite card, Show/Hide inside the field, forgot password, Terms and Privacy | Google appears only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Desktop uses the same editorial board beside the form from the `lg` breakpoint up. |
| Sign up | Person vs company, name, email, password | Same rules, wireframe fields | Same rules, elevated card, warm selected account, password hint | Recruiter, hiring manager, and platform admin stay off the public form. |
| Intent | Two-column icon cards | Text pills | Icon, title, one line, check, 44px target. Two columns from 360px; one column at 320px | Labels match the existing intent ids. |
| Location | Area chips | Plain rows | Grouped options with icons and a selected state | No silent Gachibowli. A fixture area appears only when `NEXT_PUBLIC_ENTRY_FIXTURE_AREA` is set. |
| Interests | Optional chips | Tag inputs | Grouped cards for interests, offered skills, and private career skills | Interests are still stored on the device. There is no public interests field. |
| Identity | Photo, name, title, intro | Empty fields | Graphite card. Name can repeat the account name. Title stays empty unless typed | No photo upload in this slice. Introduction and availability are not published. |
| Privacy | Profile preview | Bullet list | Ivory preview: visible now, private, career after an explicit switch | Copy still says "No location." and "Career information stays private." |
| Ready | Summary, then enter | One sentence | Chosen intents, location choice, what Arena will look for, what stays private, Enter Arena, Edit choices | No recommended people or posts. |
| Empty feed | Useful empty state, bottom bar Feed · Discover · (+) · Work · You | "Nothing here yet" on a blank page | Intent-based explanation, Discover nearby, Create, Add your area when no area is set | Ask Jenny is omitted. There is no Jenny gateway health check, and the empty feed does not call the agent. |

## Functional checks preserved

- Public signup is only "Join as a person" or "Create a company account".
- Password minimum stays 6 characters. Show and Hide still change the password field type.
- Onboarding does not send a title, city, or biography that the person did not enter.
- `PUT /location` still runs. `PUT /profile/me/details` does not run when the title and field are empty.
- Career stays private until the person turns it on.
- Completion is still stored only after `getMyProfile()` returns.
- The feed still says "Nothing here yet", "The feed did not load", and "Try again".
- Rows are marked DEMO only when `demoContent` is present.
- The visible "unknown" build stamp is gone. `/version` still returns the commit.

## Checks

- `npx eslint` on the touched entry, feed, shell, and config files passed.
- `npm run build` passed on Next.js 16.2.12.
- Playwright `tests/local/entry-journey.local.ts` with the API stubbed, not production: desktop, mobile Chromium, and mobile WebKit passed for the entry journey, sign-in, forgot password, expired reset, resume, and the axe check.
- Axe on welcome and signup: no serious or critical violations.
- `prefers-reduced-motion: reduce`: the Join Arena transition duration is 0s.
- Welcome does not scroll horizontally at 320, 360, 375, 390, 430, 768, or 1280.
