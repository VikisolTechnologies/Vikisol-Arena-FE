# PAGE-INVENTORY.md — live route/page inventory across all five roles

Reporting pass only — nothing in this document is a change to the app. Every route below was
visited on the **live production site** (`https://arena.vikisol.in` / `https://api-arena.vikisol.in`),
not local dev, using Playwright signed in as each of the five staging demo accounts from
`TEST-LOGINS.md`, at both 1440px (desktop) and 390px (mobile) viewport widths. 65 route/role
combinations, 128 screenshots. All desktop+mobile screenshot pairs are embedded in
`Arena-Page-Inventory.pdf` (same directory) alongside this table — that PDF is the single source
for the visuals; raw screenshot files weren't duplicated into the repo to avoid ~14MB of
redundant binaries on top of what the PDF already carries.

**A note on scope**: this pass was asked for against `ARENA-PAGE-INVENTORY.md`, a mission doc
that could not be located anywhere on disk (checked both repos, Desktop, Downloads). Per the
founder's direction, this report proceeds from the request as stated directly — every route
listed in `ROUTES.md`, screenshotted per role, summary table + Top-10 attention list — using
`ROUTES.md` for the route contract and `TEST-LOGINS.md` for role credentials. If the original
doc turns up, some of its own specific check-list items may not be covered here.

## Method

For each of the 5 roles (Talent, Recruiter, Company Admin, Hiring Manager, Platform Admin) plus
an unauthenticated Public pass: sign in via the real `/auth` form, then visit every route that
`ROUTES.md` marks as already existing (🚧 or ✅) for that role's surface, plus a few adjacent
routes discovered to exist in the codebase but not tracked in `ROUTES.md`'s table. Where a route
needs a real entity ID (an application, a project, a candidate, a company), the ID was discovered
live — either from a real `<a href>` on the list page, or by clicking the actual UI control a user
would click (several list pages turned out to use client-side `onClick` navigation with no `href`
at all — see finding #5) — never guessed or fabricated. Each visit records: final HTTP status,
whether the URL redirected somewhere unexpected, browser console errors, and a screenshot at both
viewport widths.

Routes `ROUTES.md` marks ⬜ (not started) were not visited — there's nothing live to screenshot.

## Summary table

All 65 checks, in the order captured. "Result" columns: **OK** = rendered as expected · **OK
(console error)** = rendered fine but threw a JS console error · **404 Not Found** = the route
doesn't resolve at all · **Misrouted** = resolved to a different, wrong-looking destination ·
**Auth wall** = a documented-public route required login anyway.

| Role | Screen | Requested route | HTTP | Result | Notes |
|---|---|---|---|---|---|
| Public (no auth) | Landing | `/` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Pricing | `/pricing` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Discover (public, logged out) | `/discover` → `/auth` | 200 | **Auth wall** | Redirected to sign-in — not actually reachable without login |
| Public (no auth) | People detail (public route per ROUTES.md) | `/people/a566d5f6-66b4-464f-adb2-2c8c35761f87` → `/auth` | 200 | **Auth wall** | Redirected to sign-in — not actually reachable without login |
| Public (no auth) | Company detail (public route per ROUTES.md) | `/companies/6decddec-22bb-4330-b6ae-dde6af04f223` → `/auth` | 200 | **Auth wall** | Redirected to sign-in — not actually reachable without login |
| Public (no auth) | Privacy | `/privacy` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Terms | `/terms` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Acceptable Use | `/aup` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Sign in / Sign up | `/auth` | 200 | **OK** | Rendered as expected |
| Public (no auth) | Branded 404 | `/this-route-does-not-exist-xyz-12345` | 404 | **OK** | Expected — this was a deliberate 404-handler check, not a real route. Branded 404 page rendered correctly. |
| Talent (candidate) | Home (feed) | `/home` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Onboarding (revisit while already onboarded) | `/onboarding` | 200 | **OK** | Rendered as expected |
| Talent (candidate) | Discover | `/discover` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Map | `/map` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Rooms (inbox) | `/rooms` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Work hub | `/work` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Applications list | `/applications` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Application detail | `/applications/46434d37-a139-4cbc-9dc6-393a4b8ee20e` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Marketplace bids | `/marketplace/bids` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Marketplace (projects) | `/marketplace` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Marketplace project detail | `/marketplace/9042a537-0823-4592-b14a-67e8088e2464` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Interviews list (expected per ROUTES.md) | `/interviews` | 404 | **404 Not Found** | 404 — route does not exist |
| Talent (candidate) | Interview detail (direct-access, no page.tsx for /interviews list) | `/interviews/e6284f3a-85ab-4b01-8f10-25583ddb6b34` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Identity (profile) | `/identity` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Notifications | `/notifications` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Settings | `/settings` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Companies list | `/companies` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Company detail | `/companies/6decddec-22bb-4330-b6ae-dde6af04f223` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Talent (candidate) | Work / Saved (nav links here but ROUTES.md says unbuilt) | `/work/saved` | 404 | **404 Not Found** | 404 — route does not exist |
| Talent (candidate) | Agent (not in ROUTES.md table but exists + nav-linked) | `/agent` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Recruiter | Enterprise dashboard (closest to /workspace) | `/enterprise/dashboard` | 200 | **OK** | Rendered as expected |
| Recruiter | Enterprise posts (workspace/posts) | `/enterprise/posts` | 200 | **OK** | Rendered as expected |
| Recruiter | Enterprise postings list (workspace/jobs) | `/enterprise/postings` | 200 | **OK** | Rendered as expected |
| Recruiter | Talent Universe search (workspace/talent) | `/enterprise/talent` | 200 | **OK** | Rendered as expected |
| Recruiter | Candidate detail (workspace/talent/[id]) | `/enterprise/talent/a566d5f6-66b4-464f-adb2-2c8c35761f87` | 200 | **OK** | Rendered as expected |
| Recruiter | Candidate public profile via /people/[id] (should be viewable, testing enterprise-session behavior) | `/people/a566d5f6-66b4-464f-adb2-2c8c35761f87` | 200 | **OK (console error)** | 1 console error(s): Failed to load resource: the server responded with a status of 404 () |
| Recruiter | Interviews list (workspace/interviews - expected per ROUTES.md) | `/enterprise/interviews` | 404 | **404 Not Found** | 404 — route does not exist |
| Recruiter | Enterprise messages (not in ROUTES.md workspace table) | `/enterprise/messages` | 200 | **OK** | Rendered as expected |
| Recruiter | Enterprise interviews/mine (recruiter, not HM - expect 403/restricted) | `/enterprise/interviews/mine` → `/onboarding` | 200 | **Misrouted** | Redirected to candidate /onboarding instead of an access-denied state (requested /enterprise/interviews/mine) |
| Recruiter | Admin: Team (should be denied - recruiter, not admin) | `/enterprise/admin/team` → `/onboarding` | 200 | **Misrouted** | Redirected to candidate /onboarding instead of an access-denied state (requested /enterprise/admin/team) |
| Company Admin | Enterprise dashboard (CA1 - sales-pitch surface) | `/enterprise/dashboard` | 200 | **OK** | Rendered as expected |
| Company Admin | Admin: Team (CA - 3 members seeded) | `/enterprise/admin/team` | 200 | **OK** | Rendered as expected |
| Company Admin | Admin: Billing | `/enterprise/admin/billing` | 200 | **OK** | Rendered as expected |
| Company Admin | Admin: Company profile | `/enterprise/admin/company` | 200 | **OK** | Rendered as expected |
| Company Admin | Admin: Audit log (CA3 - pre-seeded events) | `/enterprise/admin/audit` | 200 | **OK** | Rendered as expected |
| Company Admin | Admin: Consent (not in ROUTES.md workspace table) | `/enterprise/admin/consent` | 200 | **OK** | Rendered as expected |
| Company Admin | Enterprise posts (workspace/posts, CA7: CA can enter recruiter workspace) | `/enterprise/posts` | 200 | **OK** | Rendered as expected |
| Company Admin | Enterprise postings list (workspace/jobs) | `/enterprise/postings` | 200 | **OK** | Rendered as expected |
| Company Admin | Talent Universe search (workspace/talent) | `/enterprise/talent` | 200 | **OK** | Rendered as expected |
| Company Admin | Interviews list (workspace/interviews - expect 404, same as recruiter) | `/enterprise/interviews` | 404 | **404 Not Found** | 404 — route does not exist |
| Company Admin | Enterprise messages | `/enterprise/messages` | 200 | **OK** | Rendered as expected |
| Company Admin | Enterprise interviews/mine (CA, not HM - expect restricted/redirect) | `/enterprise/interviews/mine` → `/dashboard` | 200 | **Misrouted** | Redirected to retired /dashboard route instead of an access-denied state (requested /enterprise/interviews/mine) |
| Hiring Manager | HM landing (whatever they land on post-login) | `/enterprise/interviews/mine` | 200 | **OK** | Rendered as expected |
| Hiring Manager | HM: My interviews (documented landing per TEST-LOGINS.md) | `/enterprise/interviews/mine` | 200 | **OK** | Rendered as expected |
| Hiring Manager | HM attempting Talent Universe (should be denied per TEST-LOGINS.md) | `/enterprise/talent` → `/enterprise/onboarding` | 200 | **Misrouted** | Redirected to /enterprise/onboarding instead of an access-denied state (requested /enterprise/talent) |
| Hiring Manager | HM attempting Postings (should be denied per TEST-LOGINS.md) | `/enterprise/postings` → `/enterprise/onboarding` | 200 | **Misrouted** | Redirected to /enterprise/onboarding instead of an access-denied state (requested /enterprise/postings) |
| Hiring Manager | HM attempting Admin Team (should be denied) | `/enterprise/admin/team` → `/dashboard` | 200 | **Misrouted** | Redirected to retired /dashboard route instead of an access-denied state (requested /enterprise/admin/team) |
| Hiring Manager | HM: Enterprise dashboard | `/enterprise/dashboard` → `/enterprise/onboarding` | 200 | **Misrouted** | Redirected to /enterprise/onboarding instead of an access-denied state (requested /enterprise/dashboard) |
| Platform Admin | Admin overview | `/admin` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Tenants | `/admin/tenants` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Users | `/admin/users` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Moderation | `/admin/moderation` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Analytics | `/admin/analytics` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Flags | `/admin/flags` | 200 | **OK** | Rendered as expected |
| Platform Admin | Admin: Promotions (not built per ROUTES.md) | `/admin/promotions` | 404 | **OK** | Expected per ROUTES.md (⬜ not built yet) — consistent with docs, not a defect. |

## Top 10 for attention

Ranked by how many real users it affects and how confusing the failure is, not by how hard it'd
be to fix.

### 1. The three routes `ROUTES.md` documents as public actually require login
`/discover`, `/people/[id]`, and `/companies/[id]` are all listed under `ROUTES.md`'s "Public (no
auth)" section — the whole point being that a prospective candidate or company can browse before
signing up, and a shared profile/company link works for anyone. Live-tested logged out: all three
redirect straight to `/auth` instead of rendering. Anyone sharing an Arena profile or company page
link today is effectively sharing a login wall. This is the single highest-impact finding in this
pass — it cuts against the core "browse before you commit" positioning, not just one screen.

### 2. Wrong-role access strands users in the candidate onboarding flow instead of showing "access denied"
Confirmed three separate ways, all live:
- **Recruiter** → `/enterprise/admin/team` (company-admin-only) → silently lands on `/dashboard`
  → which itself bounces to `/onboarding` (the *candidate* "What should we call you?" flow).
- **Recruiter / Company Admin** → `/enterprise/interviews/mine` (hiring-manager-only) → same
  `/dashboard` → `/onboarding` chain (Company Admin's session stops one hop earlier, at
  `/dashboard`, than Recruiter's does — the exact stopping point isn't consistent, which is its
  own small red flag).
- **Hiring Manager** → `/enterprise/talent`, `/enterprise/postings`, `/enterprise/dashboard` (all
  recruiter/company-admin-only) → lands on `/enterprise/onboarding` instead.

None of these show a real "you don't have access" state. A recruiter or hiring manager who
mis-clicks, or follows a stale link into a surface their role doesn't cover, ends up in an
onboarding wizard that doesn't apply to them at all — for an account that's already fully set up.
Root cause (confirmed in code, not just inferred): `CompanyAdminShell`'s route guard
(`src/components/app/CompanyAdminShell.tsx:47`) sends non-company-admin sessions to `/dashboard`
on mismatch — and `/dashboard` is a route `ROUTES.md` itself documents as **"delete — ... now
fully retired"**, yet it's still live and still runs the candidate `requireOnboarded()` check,
which is what actually produces the `/onboarding` bounce.

### 3. `/interviews` and `/enterprise/interviews` — the list pages — don't exist
`ROUTES.md` states both "exist today." Live-tested: both 404. Checked the codebase directly:
`src/app/interviews/` has no `page.tsx` of its own, only an `[applicationId]` subfolder — the
detail route was built, the list route never was. The detail page itself works correctly when
visited directly (`/interviews/[applicationId]` → 200, renders "Interview with Delhivery — Waiting
on a confirmed time") — it's not broken, it's **orphaned**: nothing in the talent UI links to it.
The Applications page's interview-stage row and its "Schedule" button both stay on
`/applications/[id]` instead. A talent user with a real scheduled interview currently has no way
to reach the interview page from the UI at all.

### 4. The app's own nav prefetches a route that doesn't exist yet, on almost every page load
18 of the 65 captures in this pass show the identical console error: a 404 fetching
`/work/saved?_rsc=...`. `/work/saved` is `ROUTES.md`-documented as ⬜ not built — but the
candidate nav bar links to it anyway, so Next.js's router prefetches it in the background on
every page that renders that nav. Harmless today (nothing user-visible breaks), but it's noise on
literally every authenticated candidate screen, and noise like this is exactly what would hide a
real regression later. Cheapest fix of anything on this list: either stub the page or remove the
nav link until it's built.

### 5. Applications, Marketplace, and Companies list cards aren't real links
Discovered while trying to collect detail-page URLs for this report: none of the cards on
`/applications`, `/marketplace`, or `/companies` have an `<a href>` — they navigate via a
client-side `onClick` handler on a `div`. Practically: no right-click "open in new tab," no
hover-preview of the destination URL, no `href` for a crawler or this kind of automated audit to
find. Whether they're at least keyboard-focusable wasn't verified in this pass — worth a follow-up
accessibility check specifically.

### 6. Revisiting `/onboarding` while already onboarded shows a blank first step
Logged in as the fully-set-up talent demo account (Aarav Sharma — real profile, resume, six live
applications) and navigated to `/onboarding` directly: it shows step 1, "What should we call you?
Your agent will use this everywhere," blank, not pre-filled, with no redirect back to `/home`.
Lower severity — most users won't type this URL directly — but a real inconsistency if anyone does
(e.g. a bookmarked/shared onboarding link).

### 7. Live routes exist that `ROUTES.md`'s table doesn't track at all
Found by comparing the live site against `ROUTES.md` line by line: `/enterprise/admin/consent`,
`/enterprise/messages`, `/enterprise/interviews/mine` (+ its own `[interviewId]` detail route —
this is HM's *real* dedicated interview surface), and `/jobs/[id]` all render live but appear
nowhere in `ROUTES.md`'s route contract. `/dashboard` is listed under "Deleted / redirected" as
fully retired, but is still live, still rendering, and (per finding #2) is actively load-bearing
as a redirect hop for other bugs — not actually gone.

### 8. `ROUTES.md`'s note on Hiring Manager access is stale
`ROUTES.md` says "today HM shares the general `/interviews` route." Live-tested: the HM demo
account lands directly on `/enterprise/interviews/mine` on login (matching what `TEST-LOGINS.md`
says) — a dedicated route that already exists (see #7), not the shared `/interviews` route at
all. Small, but exactly the kind of drift that makes a route-contract doc misleading for planning
future work off of it.

### 9. Unauthorized-access attempts fire multiple failed API calls before redirecting
On `/enterprise/admin/team` as Hiring Manager, 6 separate console errors fired (the most of any
capture in this pass) before the redirect in finding #2 completed — multiple parallel data-fetch
calls each independently hitting a 403 rather than one guard check stopping all of them upfront.
Not user-visible, but it's wasted requests against the backend for a page the visitor was never
going to be allowed to see.

### 10. `/admin/tenants` — no detail view found via normal interaction
Platform Admin's tenant list renders correctly (10 tenants, real data), but clicking the tenant
rows and their visible action buttons ("Subscription," "Suspend") never surfaced a
`/admin/tenants/[id]` detail view in this pass. Not confirmed broken — could simply need a
different click target this pass didn't try — flagged for a manual spot-check rather than
reported as a defect outright.

## Per-role notes

**Public** — 7 of 10 checks OK; the 3 auth-wall failures are finding #1, the single biggest issue
in this report. `/` and `/pricing` render cleanly logged out. The 404 handler itself (tested with
a made-up path) works correctly and shows the branded orb 404 page.

**Talent** (`demo.talent@vikisol.dev`) — 20 routes, all reachable, all 200 except the two
documented-as-unbuilt routes (`/interviews`, `/work/saved`). Every authenticated screen carries
finding #4's console noise. Onboarding-revisit (#6) is the only real behavioral oddity.

**Recruiter** (`demo.recruiter@vikisol.dev`) — full workspace access (dashboard, posts, postings,
Talent Universe, candidate detail, messages) all clean. The two access-control checks
(`/enterprise/interviews/mine`, `/enterprise/admin/team`) both produced finding #2's misrouting.
`/enterprise/interviews` 404s the same way `/interviews` does (#3).

**Company Admin** (`demo.enterprise@vikisol.dev`) — lands on `/enterprise/admin` (not
`/enterprise/dashboard`, worth knowing since Recruiter's landing differs). Full admin console
(team, billing, company profile, audit log, consent) all render cleanly with real seeded data.
Also has recruiter-workspace access per the code's own "CA7" comment — confirmed working. The one
access-control check that applies to this role (`/enterprise/interviews/mine`, HM-only)
reproduces finding #2 partway (stops at `/dashboard`, doesn't continue to `/onboarding`).

**Hiring Manager** (`demo.hiringmanager@vikisol.dev`) — lands directly on
`/enterprise/interviews/mine` as documented, real seeded interview visible. All three
restricted-surface checks (Talent Universe, Postings, Dashboard) reproduce finding #2's
misrouting pattern (a different variant of it — see #2's detail).

**Platform Admin** (`admin@vikisol.dev`) — `/admin`, tenants (10 real tenants), users, moderation,
analytics, and flags all render cleanly with real data. `/admin/promotions` 404s, which is exactly
what `ROUTES.md` documents (⬜, not built) — not a defect. Tenant detail view unresolved, see #10.

## What this pass did not cover

- Routes `ROUTES.md` marks ⬜ (not started) — nothing exists yet to screenshot.
- `/auth/invite/[token]` — no valid invite token was available this pass; untested.
- Deep interaction testing within a page (this is a load-and-look inventory, not the button-by-
  button audit `MOBILE-BUGS.md` already did for the migrated screens).
- Full accessibility audit of the non-link card pattern in finding #5 — flagged, not verified.
