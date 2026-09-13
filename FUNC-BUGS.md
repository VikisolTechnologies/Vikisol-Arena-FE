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

## OPEN

### F2 — Enterprise workspace's role guard is inconsistently applied (P1)
**Roles:** recruiter, hiring_manager · **Routes:** `/enterprise/admin`,
`/enterprise/talent` (recruiter only had the `/admin` case; hiring_manager hit
both)

The backend correctly returns 403 for roles that shouldn't reach these
endpoints (`GET /enterprise/admin/dashboard`, `GET /enterprise/talent/search`)
— authorization itself is not broken. But the **frontend's** handling of that
403 is inconsistent across routes in the same section:

- `/enterprise/postings` and `/enterprise/dashboard` correctly redirect an
  unauthorized role to the dedicated `/access-denied` page.
- `/enterprise/talent` and `/enterprise/admin` do **not** — they fall through
  to the generic branded 404 ("This page isn't in my database"), which is the
  wrong message: the page exists, the user just isn't allowed on it. A
  recruiter or hiring manager seeing this reasonably concludes the admin
  console doesn't exist at all, rather than that they lack permission — the
  wrong signal to give someone who might legitimately need to ask an admin for
  access.

**Evidence:** captured live, mobile viewport, screenshots at
`/tmp/census-shots/recruiter_enterprise_admin.png` and
`/tmp/census-shots/hiringmanager_enterprise_talent.png` during this session
(not committed to the repo — regenerate via the same TEST-LOGINS.md accounts
if needed).

**Suggested fix:** find wherever `/enterprise/postings` and
`/enterprise/dashboard` do their client-side role check + redirect to
`/access-denied`, and apply the same guard to `/enterprise/talent` and
`/enterprise/admin` (and its sub-routes — `/enterprise/admin/audit` etc. were
not independently re-tested this pass but likely share the same gap since
they sit behind the same section).

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

### F5 — Two pre-existing lint findings, not yet fixed (P2)

Surfaced by `npm run lint` while verifying this session's own changes, both
pre-existing and unrelated to anything touched this pass:

- `src/app/settings/page.tsx:91` — `setCurrentEmail(getSession()?.email ?? "")`
  called synchronously inside a `useEffect` body (real
  `react-hooks/set-state-in-effect` lint error, not a warning). Causes an
  extra render on every visit to Settings; not currently causing a visible
  bug, but exactly the class of thing that becomes one under React's stricter
  concurrent-rendering rules.
- `src/components/auth/PhoneAuthForm.tsx:3` — `useRef` imported but never
  used (warning only).

Not fixed in this batch to keep it to one concern (the identity graph); real,
cheap, low-risk fixes for the next batch.

### F4 — Leftover test content in the demo talent account's feed (P2)
**Role:** talent · **Route:** `/home`

The top post in `demo.talent@vikisol.dev`'s feed is titled "Golden path test
activity 1786489017846" — clearly a QA artifact from a prior verification
pass, not real seed content. Harmless functionally, but this is the account
TEST-LOGINS.md describes as demo-ready ("Onboarded profile... resume already
uploaded...") — worth deleting the post so a sales/demo walkthrough doesn't
lead with a raw test string. Not fixed here (content cleanup, not code;
flagging rather than deleting someone's data without confirmation).

---

## Confirmed NOT bugs (checked and cleared this pass)

- **hiring_manager correctly blocked** from `/enterprise/postings`,
  `/enterprise/talent`†, `/enterprise/dashboard` (redirected/blocked as
  designed — see F2 for the `/talent` messaging caveat) and correctly lands on
  `/enterprise/interviews/mine` with no restriction, matching TEST-LOGINS.md's
  description of the lite workspace.
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

† hiring_manager's `/enterprise/talent` block is real (403 enforced) but
mis-messaged — see F2.

---

## Not yet covered (deferred, not forgotten)

This pass covered every top-level route reachable from each role's own
navigation, on mobile only, and checked page-load health (console/network
errors, redirects) rather than clicking every individual button/submitting
every form — the full "click every button, submit every form" sweep
(ARENA-FIX-EVERYTHING.md §1A) on desktop width, plus the golden-path signup→
apply→interview→message flow (§2.4), are the next slice of Phase 1/Phase 2
work, not abandoned.
