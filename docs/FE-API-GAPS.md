# Frontend → backend gaps

What B+ screens need that Arena BE doesn't provide yet. Until a row is built, the screen keeps
the answer on the device (or uses labelled preview fixtures) and says so. This file is the
backend plan (FE-BPLUS-BUILD §6). One row per gap; newest phase last.

| # | Screen (phase) | What's needed | Fields | Today |
|---|---|---|---|---|
| 1 | Onboarding — Why are you here? (P1) | Store the person's reasons for joining | `PUT /profile/me/intents` `{ intents: ("activities"\|"meet"\|"ask"\|"offer"\|"job"\|"hire"\|"projects"\|"explore")[] }` | Local draft only; Feed reads it on this device |
| 2 | Onboarding — Local life / Identity (P1) | Personal interests (distinct from skills) | `PUT /profile/me/interests` `{ interests: string[] }` (≤30 chars each) | Local draft only |
| 3 | Onboarding — Your identity (P1) | Profile photo upload | `POST /profile/me/photo` multipart → `{ photoUrl }`; `DELETE` to remove | Downscaled 256px copy on device only |
| 4 | Onboarding — Your identity (P1) | Partial profile update: display name, title, intro without also requiring industry/experience/rate (today `PUT /profile/me/details` requires all of them) | `PATCH /profile/me` `{ name?, title?, bio? (≤160) }` | Local draft only |
| 5 | Onboarding — Your identity (P1) | Availability | `PATCH /profile/me` `{ availability: ("weekdays"\|"weekends"\|"evenings")[] }` | Local draft only |
| 6 | Sign up / Sign in (P1) | Google sign-in on the preview: backend support exists (`POST /auth/google`); the frontend needs `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set in the preview environment | config, not an endpoint | Button and "or" divider hidden until set |

Saved for real today (no gap): sign up, sign in, 2FA code, forgot/reset password, area
(`PUT /profile/me/location` with `consent: "city"`) and current location (`consent: "precise"`,
stored coarsened by the backend).
