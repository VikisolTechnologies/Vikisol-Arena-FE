# API issues (frontend → backend)
One entry per mismatch: endpoint, what the frontend expects, what the backend returns, status (OPEN / FIXED <commit>).

## 18+ isn't enforced at sign-up or by `PUT /verification/date-of-birth` (FIXED 50ea099, dateOfBirthSet in 48a9a4f)
- **Endpoint:** `POST /auth/signup`, `PUT /verification/date-of-birth`.
- **FE expects:** an account's date of birth to be rejected (or sign-up itself to refuse) when it
  makes the person under 18 — the age rule enforced at the point it's collected, not only later.
- **BE returns:** `SignUpRequest` has no date-of-birth field at all.
  `VerificationService.setDateOfBirth` stores any past date unconditionally (only checks it isn't
  in the future) — `AgeUtil.isAdult` is only ever consulted later, by `PostService.requireAdult()`
  at activity create/join.
- **What the FE does instead:** added a mandatory age-gate step to onboarding (`AgeGateStep`,
  first step, before "why are you here" and before the "Explore first" skip) that calls the real
  `PUT /verification/date-of-birth` and refuses client-side (a dead-end "Arena is for people 18
  and older" screen, sign-out only) when the date makes the person under 18. This is honest but
  not safe against someone just typing a different date — the architect asked for the rule to be
  enforced on the backend too (architect notes on B8/B9, 1 Oct). Also: `VerificationStatusResponse`
  has no field saying whether a date of birth is already on file, so the FE can't skip re-asking
  on a second device — not blocking, just worth a boolean (`dateOfBirthSet`) if it's cheap to add
  while this is being worked on.

## `PATCH /profile/me` lowercases `availability` (FIXED 48a9a4f)
- **Endpoint:** `PATCH /profile/me`.
- **FE sends:** `availability: ["Weekends"]` — the exact labels in `AVAILABILITY`
  (`src/lib/data/onboarding.ts`: `"Weekdays" | "Weekends" | "Evenings"`, Title Case, shown as-is
  on the Identity step's chips).
- **BE returns:** `{"availability":["weekends"]}` — lowercased. Confirmed live:
  `curl -X PATCH .../profile/me -d '{"availability":["Weekends"]}'` → response has `"weekends"`.
- **Why it matters:** `GET /profile/me/basics`'s `availability` won't exact-match the FE's own
  `AVAILABILITY` constant, so a value read back from the server (not just the local draft) won't
  highlight the right chip. Not reproduced yet from a real read-back screen — area 2 only writes
  this field today — but will bite the first screen that reads `GET /me/basics` and renders these
  chips. Not worked around in the FE; the backend should keep the casing it's given.

## `POST /posts/{id}/attendance/confirm` and `POST /posts/{id}/feedback` don't exist (CLOSED: FE path error)
- **Architect review of area 3 (1 Oct, night):** these aren't missing — they live under
  `/activities`, not `/posts` (`ActivitiesController.java`: `POST /activities/{id}/attendance/confirm`,
  `POST /activities/{id}/feedback`). The curl above tested the wrong path; a real 404 for a
  made-up route proves nothing about whether the right one exists. Closed, no backend work
  needed. Area 3b (below) wires both at the correct path and verifies them live, end to end,
  with two real accounts.

## `POST /media/upload-signature` wasn't configured locally (FIXED, B12)
- Backend B12 added a dev-only local-disk fallback when Cloudinary env vars are absent. Verified
  live during area 3b: `POST /activities/{id}/cover` (multipart) succeeds and returns a real,
  fetchable `coverUrl` signed by `FileStorageService`.
