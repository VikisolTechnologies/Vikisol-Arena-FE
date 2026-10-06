# Review — f523fcf, FE B+ P1: entry and onboarding

Board: "ARENA B+ — Entry & progressive onboarding". Screens at 390×844 and 320px in
`docs/reviews/p1/` (`1-welcome`, `2-signup`, `3-signin`, `3b-forgot`, `4-why`, `5-local`,
`6-identity`, `7-ready`).

## Differences from the board, and why
| Screen | Board | Built | Why |
|---|---|---|---|
| Welcome | Stock runners at a lake | Real Durgam Cheruvu sunset, credited | Real launch-zone landmark, no invented people; CC BY-SA credit required |
| Sign up | "Use at least 8 characters" | 6 | Backend rule (`SignUpRequest @Size(min = 6)`) |
| Sign up / in | Google button + "or" | Hidden | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` isn't set for preview (FE-API-GAPS #6) |
| Sign up | — | Quiet "Hiring for a company?" link | Keeps company sign-up working until P7's role chooser |
| Onboarding | 6 dots | 4 dots | 4 real steps (honest progress) |
| Local life | Gachibowli pre-selected | "Choose your area" | Don't guess where someone lives |
| Identity | — | "…stay on this device" line when relevant | Photo/intro/interests/availability can't be stored yet (FE-API-GAPS #1–5) |
| Buttons | White ~16px label | White 19px bold | White on #FF5A1F is 3.12:1 → large-text AA |

## UI UX Pro Max checklist — findings fixed
- Validation on blur with inline `aria-describedby` errors; focus to first invalid field on submit.
- Cookie banner covered the primary Continue on first visit → B+ screens reserve its height.
- Banner buttons were 30px → 44px; photo-credit link given a 44px target.
- Initials avatar text 4.1:1 → ink text.
- Selection never by colour alone (ring + check); step dots have "Step n of 4" for screen readers.

## Checks
tsc, eslint, build clean · 12/12 Playwright (desktop, Pixel 7, iPhone WebKit), API intercepted,
asserting request bodies (sign-up, location `{consent:"city", city}`) and that onboarding never
calls `/profile/me/details` · axe: 0 serious/critical on all 9 screens · no overflow at
320/360/375/390/430/1280 · reduced motion: no transitions on buttons, Ken Burns/confetti off.
