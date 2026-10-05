# API issues (frontend → backend)
One entry per mismatch: endpoint, what the frontend expects, what the backend returns, status (OPEN / FIXED <commit>).

## `GET /connect-requests/{employer-side}` doesn't exist — no way to check prior connect status for one candidate (OPEN, minor)
- **Endpoint:** none exists. `ConnectController` only has `POST /enterprise/talent/{candidateId}/connect`
  (employer, idempotent — returns the existing row if one's already there), `GET /connect-requests`
  (candidate's own "mine" list), and `POST /connect-requests/{id}/accept|decline` (candidate).
- **FE expects:** when an employer reopens a talent profile they already sent (or got accepted/
  declined on) a connect request for, a way to show that status without re-sending.
- **BE returns:** nothing — there's no employer-side "my connect status with this candidate" GET.
  The only way to learn the current status is to call the idempotent `POST .../connect` again
  (which requires a non-blank note even though it won't create a duplicate) and read its response.
- **What the FE does instead:** `src/app/enterprise/talent/[id]/page.tsx` shows a "Connect" button
  on every page load regardless of prior history; clicking it (with a note) surfaces the real
  status via the idempotent response. Functionally correct — verified live (send, then re-send,
  returns the existing `accepted` row with its `conversationId`, no duplicate created) — just a
  rougher UX than a dedicated status check would give. Not blocking; worth a cheap backend GET if
  this screen gets more traffic.

## `GET /connect-requests` (the candidate's "mine" list) never includes `conversationId`, even for accepted requests (OPEN, minor)
- **Endpoint:** `GET /connect-requests`.
- **FE expects:** the same `conversationId` the `POST /connect-requests/{id}/accept` response
  includes, so a candidate revisiting this list later can jump straight to the right thread.
- **BE returns:** `ConnectController.mine()` → `ConnectService.mine()` maps every row through
  `view(r, null)` — the second argument (`conversationId`) is hardcoded `null` in the list path;
  only `decide()` (the accept/decline call itself) ever passes the real one. Confirmed live: list
  an already-accepted request, `conversationId` is absent from the JSON.
- **What the FE does instead:** `src/app/connect-requests/page.tsx`'s Message link falls back to
  the general `/messages` inbox when `conversationId` is missing, instead of a dead/wrong link.
  Not blocking — the conversation does exist and is reachable from the inbox — but the dedicated
  deep link only works on the same page load where the accept just happened.

## No backend endpoint for a general content browser, an audit log, or an admin team roster (OPEN)
- **Endpoints:** none exist. Checked `PlatformAdminController` (dashboard/tenants/users/
  moderation/analytics/flags), `AdminAccountController`, `AdminDisputeController`,
  `AdminVerificationController`, `ConnectController` and `IndustryController` - the full set of
  `/admin/**` routes in the backend. Nothing serves a general "browse all content" list, a
  platform-wide audit log (with or without CSV export), or an admin team/roster.
- **FE expects:** three screens the mission names directly - `/admin/content` ("Content browse
  not connected"), `/admin/audit` ("Platform audit log not connected"), `/admin/team` ("Admin
  team API not connected"). All three already say exactly this in their own UI copy; confirmed
  by reading every `/admin/**` controller rather than taking the copy's word for it.
- **Not worked around:** there's nothing to wire these to yet. `AuditService.record(...)` is
  called from several places (moderation, verification, disputes, account actions) and clearly
  writes audit rows somewhere, but no controller currently reads them back. Flagging this as the
  one real, still-open item from Step B's admin sweep - everything else that said "not connected"
  (moderation's warn/suspend/ban, users' suspend/restore/force-signout, disputes, industries) in
  fact had a live backend endpoint and just needed wiring; these three genuinely don't yet.

## `GET /admin/users` (the search list) never includes account status (OPEN, minor)
- **Endpoint:** `GET /admin/users`.
- **FE expects:** a way to show suspended/banned accounts in the search results list itself,
  without opening every profile one at a time.
- **BE returns:** `PlatformUserResponse` has only `id, name, email, role, tenantId, tenantName,
  createdAt` — no status field. Only `GET /admin/users/{id}` (the single-account detail,
  `AdminAccountService.AccountDetail`) carries `status`/`suspendedUntil`/`bannedAt`.
- **What the FE does instead:** `src/app/admin/users/page.tsx` shows every row as "active" until
  the admin opens that one profile or acts on it in the current session (tracked in local state,
  not persisted). Not blocking — suspend/restore/force-signout all work correctly against the
  real account — just means a cold page load can't show who's already suspended across the board.

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
