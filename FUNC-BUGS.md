# FUNC-BUGS.md

ARENA-FIX-EVERYTHING.md Phase 1A. Evidence gathered by signing into production
(`https://arena.vikisol.in`) as every demo role from TEST-LOGINS.md and
sweeping the real route set (from `src/app/**/page.tsx`, not `ROUTES.md` —
see STRUCTURE.md for why that file is not current ground truth), at 390×844
(iPhone-width viewport), capturing console errors and any HTTP ≥400 response.
Status column reflects this pass, not a promise about future passes.

Severity: **P0** breaks a core flow or leaks data across roles · **P1** a
route is wrong/broken but has a workaround · **P2** cosmetic/low-traffic.

---

## FIXED THIS PASS

### F6 — 21% of the entire enterprise-visible talent pool was fake QA accounts
**Role:** recruiter · **Route:** `/enterprise/talent` (Talent Universe)

Queried the search API directly with no filter: **47 candidates total in the
whole enterprise-visible pool, 10 of them named "Golden Path Test"** (one
"Golden Path Test New Talent," nine "Golden Path Test QA Engineer," all in
Bengaluru, all sharing the same two canned description strings verbatim —
"Comes up frequently in searches like this one - high signal, low noise." /
"Recently active, open to new roles, and priced within typical range."). A
recruiter searching "engineer" got 8 of these in the first 17 results.

This is TEST-LOGINS.md's own described "sales-pitch surface" (Talent Universe
search, full recruiter workspace) — over a fifth of the searchable candidate
database being obvious QA leftovers is a real problem for any demo or trial
that touches this screen, in the same family as F4 (the QA-spam posts/
notifications, already cleaned up) but a full order of magnitude bigger and a
different kind of object entirely: **these are user accounts** (candidate
profiles behind real auth records), not posts or notifications.

**How this was resolved — deliberately NOT a fresh hard-delete.** Before
building anything, mapped every entity referencing `User`/`CandidateProfile`/
`EnterpriseProfile` across the whole codebase (30+ entities; several secondary
roles — `ModerationItem.reporter`/`resolvedBy`, `Follow.followingUser`,
`RoomMessage.sender`, etc. — have no repository support for a user-scoped
delete or even a find at all). That research, and the risk it implied, turned
out to already be independently reached by a prior pass: `User.deletedAt`
already exists, wired through `CandidateProfileService.deleteMyAccount` (the
DPDP right-to-erasure path behind `DELETE /profile/me`), with its own comment
explaining it anonymizes + permanently disables login **rather than**
hard-deleting, specifically because cascading a real delete through every FK
reference safely was assessed as too large and risky.

Reused that exact mechanism instead of duplicating it: added
`DELETE /admin/users/{id}` (platform_admin only,
`PlatformUserService.eraseAccount`) that calls the same
`deleteMyAccount` logic against a target user chosen by an admin, audited
separately (`AuditActions.ACCOUNT_ERASED_BY_ADMIN`, distinct from the
self-service `ACCOUNT_DELETED`) so the trail shows who triggered it. Used it
on all 10 accounts, live.

**Also found and fixed as part of this: F7 — the search filter gap.**
`CandidateProfileRepository.search()` never excluded an already-anonymized/
erased account. Practical effect: the DPDP erasure flow didn't actually
remove a candidate from enterprise search at all — just renamed them to
"Deleted user" and left them fully visible and clickable, which defeats the
point of a right-to-erasure feature. Added `c.user.deletedAt is null` to the
query.

**Verified live:** talent pool went from 47 → 37 candidates; zero "Golden
Path Test" results anywhere; searching "engineer" now returns only real
seeded candidates.

### F1 — `/identity`'s skills graph was effectively invisible (P0)
**Role:** talent · **Route:** `/identity` · **Device:** mobile + desktop (color bug, not a breakpoint bug)

`ForceGraph.tsx` (the canvas-rendered skills graph, the main content of the
default "Preview" tab on the Identity/Profile page) drew every non-center node
in near-white fills and text (`#F5F5F6`, `rgba(255,255,255,0.06)`), and used
an additive (`"lighter"`) blend mode for the cluster-glow halos. Both were
correct for the old dark canvas this component was originally built against,
but the card it renders inside is now the ivory product theme (`bg-card`) —
so skill nodes and their labels were essentially invisible, and the additive
glow washed out to pale, meaningless blobs instead of a visible halo. Only the
solid-orange center node (hardcoded, unaffected by the bug) was visible,
making the whole page look broken/empty below the stats block.

**Status: fixed and verified live** — see `src/components/identity/ForceGraph.tsx`
(commit `0f8586c`). Confirmed on production: skill nodes (`Python`, `5 yrs
exp`, etc.), connecting lines, and labels are now legible against the ivory
card.

**Follow-up, not yet fixed (P2):** on a 390px viewport, peripheral nodes can
now clip against the card's rounded edge — visible, but not invisible, so
lower severity than the bug it replaced. Candidate fix: clamp node radius
against the canvas's own measured bounds in the spring simulation, or reduce
`restLen`/`repel` radius on narrow viewports. Logged, not fixed, to keep this
batch to one concern.

---

### F5 — Two pre-existing lint findings (fixed)

Surfaced by `npm run lint` while verifying this session's own changes, both
pre-existing and unrelated to anything touched earlier this pass:

- `src/app/settings/page.tsx:91` — `setCurrentEmail(getSession()?.email ?? "")`
  called synchronously inside a `useEffect` body (real
  `react-hooks/set-state-in-effect` lint error, not a warning). **Fixed**:
  silenced with the same documented eslint-disable convention `AppShell.tsx`'s
  own `loggedIn` state already uses for this exact class of client-only
  session read — not a behavior change, just acknowledging it's deliberate.
- `src/components/auth/PhoneAuthForm.tsx:3` — `useRef` imported but never
  used (warning only). **Fixed**: removed, confirmed genuinely unused first.

### F4 — The demo talent account's notification center is flooded with QA spam (P1, upgraded from P2)
**Role:** talent · **Routes:** `/home`, `/notifications`

Not just one leftover post (as first found on `/home` — "Golden path test
activity 1786489017846"): `/notifications` shows at least 7 unread "New join
request" entries, all from a fabricated user called "Golden Path Test," all
dated "32d ago," each referencing a different numbered "Golden path test
activity" post. This is QA/verification-run output that never got cleaned up
after whatever prior pass generated it — real notification-generation
machinery working exactly as designed, fed fake input.

This is the account TEST-LOGINS.md documents as the demo-ready one ("Onboarded
profile... live application history... agent chat + activity journal") — right
now, opening its notification bell in front of anyone is opening a wall of
test spam, and its feed leads with the same. Directly the kind of thing the
brief's "never fabricate network activity" rule (and the user's own explicit
"don't fake Arena Pulse" instruction from the design-direction conversation)
is meant to prevent — the fabrication isn't in the code path here, but in
leftover data sitting where a real demo would see it.

**Status: fully cleaned up, both rounds.** Added a real `DELETE /posts/{id}`
to arena-api (author-only; refuses on a post whose room already has messages,
pointing at the existing `cancel()` instead) and a matching
`DELETE /notifications/{id}` (author-only hard delete — nothing like it
existed either). Used both, live:

- All 10 "Golden path test activity" posts handled: 4 hard-deleted, 6 had
  real chat history in their rooms so were `cancel()`ed instead.
- The 7 *other* leftover test posts found while doing this (from apparently
  unrelated earlier QA sessions — "QA test post for N+1 tag batching
  verification," two "badminton test" posts, two "Safety-audit/safety-suite
  live test" posts, a "Full flow test: coffee meetup" post, a "Nearby-search
  test post") also handled: 3 hard-deleted, 4 were already cancelled from
  whichever earlier session created them (no action needed).
- 11 stale notifications deleted outright (the 8 Golden-Path-Test join
  requests, plus 3 more from the other test posts' fake join requests).

Verified live afterward: `/home` now leads with a real seeded job posting
(Zoho — Business Development Manager), and `/notifications` shows only
genuine entries (5 real "Application submitted," "Complete your profile,"
the welcome notification). No test content left anywhere in either surface
for this account.

---

## OPEN

### F3 — Sentry error reporting is being rejected in production (P1, quiet)
**Roles:** all, including logged out · **Routes:** every route tested

Every single page load in this census triggered a `403` from
`https://sentry.io`'s ingest API for the configured DSN
(`sentry_key=eb5c...`), on every role and every route, logged-out included.
This isn't a user-facing bug — nothing in the product breaks — but it likely
means **production JS errors are not reaching Sentry at all** right now,
which quietly defeats exactly the kind of visibility this whole repair pass
depends on going forward.

**Not something I can fix from this repo**: a 403 from Sentry's own ingest
endpoint means either the DSN/key was revoked, the project hit a quota, or
the project's allowed-origins list doesn't include `arena.vikisol.in`. All
three need Sentry dashboard access. **Logged in BLOCKERS.md (B2)** — needs
Syam to check the Sentry project directly.

---

## Confirmed NOT bugs (checked and cleared this pass)

- **Recruiter workflow, both false alarms caught before being reported.**
  Testing the postings → applicants → talent search flow live as
  `demo.recruiter@vikisol.dev` produced two things that looked broken on
  first pass and weren't: (1) clicking "Applicants" on a posting card
  appeared to do nothing — a `getByRole` click fired too early in one test
  script run, before the page had fully settled; a slower, more careful retry
  showed the existing `onClick={() => router.push(...)}` handler
  (`src/app/enterprise/postings/page.tsx`) working exactly as written. (2) the
  applicant pipeline page for a posting with zero applicants appeared stuck on
  a loading spinner forever — a screenshot taken too early (before the API's
  correctly-empty response had finished rendering) caught it mid-load; a
  longer wait showed the real, working state: all five stage columns
  correctly rendering "0 / Nothing here." Neither was a real defect, both were
  this session's own test timing. Not fixed, because nothing needed fixing.
- **The "inconsistent role guard" originally reported as F2 — retracted.**
  First read of the census screenshots looked like a real bug: some
  `/enterprise/*` routes redirect an unauthorized role to `/access-denied`,
  others (`/enterprise/admin` and its sub-routes) render the same branded 404
  in place without a URL change, so it looked like inconsistent handling.
  Reading the actual guard code (`src/lib/auth-guard.ts`'s `denyWrongRole`,
  and `CompanyAdminShell.tsx`'s own inline state machine) shows this is
  **deliberate, already-documented security design**, not a gap: both paths
  render the identical "this page isn't in my database" response on purpose,
  specifically so a wrong-role visitor can't distinguish "this route doesn't
  exist" from "this route exists but you can't have it" — the same reasoning
  `PlatformAdminShell` already established (see that file's own PA7 comment,
  cross-referenced in `ARENA-INVENTORY-FIXES.md` FIX 2). Two different
  mechanisms (a URL redirect vs. an in-place render) reaching the same
  intentional outcome isn't inconsistency, it's two entry points converging on
  one policy correctly. **Nothing was fixed here, because nothing was broken**
  — flagging my own original finding as wrong rather than leaving it on the
  record or "fixing" a deliberate security pattern.
- **hiring_manager correctly blocked** from `/enterprise/postings`,
  `/enterprise/talent`, `/enterprise/dashboard` (redirected/blocked as
  designed) and correctly lands on `/enterprise/interviews/mine` with no
  restriction, matching TEST-LOGINS.md's description of the lite workspace.
- **company_admin full workspace** (`/enterprise/admin`, `/enterprise/talent`,
  `/enterprise/dashboard` +more) — the batch census script logged this role as
  completely broken (401s everywhere, timeouts). Re-verified in an isolated,
  freshly-launched browser context: sign-in, session persistence, and
  `/enterprise/talent` all worked cleanly with zero errors. The batch failure
  was a test-harness artifact (likely a login-timing race from running six
  roles back-to-back in one long-lived browser process), not a product bug —
  not reporting it as one.
- **Branded 404** renders correctly for a nonexistent route, logged out.
- **`/pricing`'s only console error** is the same Sentry 403 as F3, not a
  page-specific defect.

---

## Not yet covered (deferred, not forgotten)

This pass covered every top-level route reachable from each role's own
navigation, on mobile only, and checked page-load health (console/network
errors, redirects) rather than clicking every individual button/submitting
every form — the full "click every button, submit every form" sweep
(ARENA-FIX-EVERYTHING.md §1A) on desktop width, plus the golden-path signup→
apply→interview→message flow (§2.4), are the next slice of Phase 1/Phase 2
work, not abandoned.
