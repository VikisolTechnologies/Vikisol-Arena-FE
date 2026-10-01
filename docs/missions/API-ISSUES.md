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

## `POST /posts/{id}/attendance/confirm` and `POST /posts/{id}/feedback` don't exist (OPEN)
- **Endpoint:** `POST /posts/{id}/attendance/confirm`, `POST /posts/{id}/feedback`.
- **FE expects:** the joiner side of the activity after-care flow (A13/A14, `ARENA-APP-FLOW.md`
  §3) — confirm attendance or raise a 72h dispute, then private "would you join again?" feedback.
  Documented as FE-API-GAPS.md row 25.
- **BE returns:** `404 Not found` for both, verified live against the local backend
  (`curl -X POST http://localhost:8081/api/v1/posts/{id}/attendance/confirm -d '{"attended":true}'`
  with a real joiner token on a real activity, after the host's own check-in/outcome call on the
  same join succeeded) — same 404 shape as a deliberately made-up path, so this isn't a
  not-yet-reachable route, the endpoints aren't implemented.
- **What the FE does instead:** only the host side exists (`CheckInSheet.tsx` →
  `recordJoinOutcome` → `PUT /posts/{id}/joins/{id}/outcome`, already real-mode and verified
  live). No joiner-side "confirm attendance / dispute" or feedback UI was added — per M6's rule,
  the frontend doesn't build screens for endpoints that don't exist yet.

## `POST /media/upload-signature` isn't configured on this backend (OPEN, local-only so far)
- **Endpoint:** `POST /media/upload-signature`.
- **FE expects:** a Cloudinary signature so activity/post cover photos and videos can upload
  (`src/lib/api/media.ts`).
- **BE returns:** `400 { "message": "Photo and video uploads aren't set up yet." }`, verified live
  with a real token against `http://localhost:8081/api/v1/media/upload-signature`.
- **Why it matters:** blocks verifying the photo-cover path (as opposed to the procedural cover,
  which is drawn client-side and needs no endpoint, and was verified) end to end against this
  backend instance. Likely just missing Cloudinary env vars on this local server rather than a
  code gap — flagging so whoever owns local backend config (B9) can confirm.
