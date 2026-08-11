# SLEEP-REPORT.md — ARENA-INVENTORY-FIXES.md P0/P1 pass (2026-08-11)

All four P0/P1 findings from `PAGE-INVENTORY.md` (commit `5fa15d1`) are fixed, deployed, and
verified live at 1440px and 390px. Full per-fix reasoning is in `DECISIONS.md`. This file is the
"what happened while you were away" summary: what changed, what was actually checked, and what
I'm not fully sure of.

## What changed

**FIX 1 — public routes.** `/discover`, `/people/[id]`, `/companies/[id]` now render logged-out
with real content. This needed both layers: the frontend guard (`requireOnboarded()` removal +
new `SignInPrompt` dialog for account-only actions) AND the backend, which I found was
independently blocking the same three routes (`ProfileController`/`CompanyController`/
`PostController` all had a class-level `hasRole('TALENT')`, and `SecurityConfig` had no
`permitAll()` for any of them). Fixed both. Added `generateMetadata` via sibling `layout.tsx`
files so shared links get real OG previews.

**FIX 2 — wrong-role redirects.** Traced to two mechanisms, fixed both: `CompanyAdminShell`/
`HiringManagerShell`'s explicit `router.replace("/dashboard")`, and — the bigger one —
`requireOnboarded()`/`requireEnterpriseOnboarded()` (shared by ~34 pages) checking an
onboarding-*completion* flag instead of role, which misfires for any non-candidate/non-enterprise
session regardless of which shell wraps the page. Centralized the fix in `auth-guard.ts`. New
`/access-denied` route renders the same branded 404 `PlatformAdminShell` already used for this
exact problem. `/dashboard` is deleted (redirects to `/home`); `not-found.tsx`'s recovery button
is now role-aware instead of pointing at the deleted route.

**FIX 3 — `/interviews` / `/enterprise/interviews` 404s.** Redirected to each role's nearest
real equivalent (`/applications`, `/enterprise/postings`) rather than building new list pages —
checked first, and neither role has a backend list endpoint for this today (only HM's own
`/interviews/mine` exists). Building one is real, unscoped feature work. Also found and corrected
the original audit's own claim that the detail route was "orphaned" — it isn't; `/applications`'
Schedule flow reaches it via a dialog, not a direct link, which is why the first pass missed it.

**FIX 4 — `/work/saved` 404.** Built the page. Turned out small: save/unsave and
`GET /posts/saved` were already fully wired, only the list page was missing.

## What I verified (not just "should work")

Live Playwright runs against `arena.vikisol.in`, both viewports, real accounts:

- **FIX 1**: all three routes render real data logged out (screenshots taken). Regression-checked
  that `/profile/me` and the `/companies` list are still correctly `401`ed anonymously.
- **FIX 2**: 12 wrong-role/role combinations tested (recruiter→company-admin pages, HM→recruiter
  pages, HM→admin pages, recruiter→candidate pages) — all show the branded 404, never onboarding,
  never `/dashboard`. Confirmed the *correct*-role case (talent hitting `/dashboard`) still lands
  cleanly on `/home`, not blocked.
- **FIX 3**: both redirects confirmed live, land on real pages with content, not further 404s.
- **FIX 4**: full save → appears on `/work/saved` → unsave-from-list flow tested end to end. Also
  confirmed the actual regression this was chasing: `/home` now shows **zero** failed network
  requests (previously 1 per load, every load).

## A real infrastructure problem, found along the way

**arena-api's Railway service has a broken GitHub auto-deploy.** Pushing to `arena-api` does NOT
trigger a build (confirmed twice — pushed, waited, nothing happened). `railway redeploy
--from-source` *also* silently failed to pick up the new commit twice in a row (deployed
successfully, but the code genuinely wasn't there — I proved this with a throwaway test rule that
still 401'd after two "successful" `--from-source` redeploys). Only `railway up` (direct
local-disk upload, bypassing GitHub entirely) actually got my changes live. This means **anyone
pushing to arena-api right now will see a green Railway deploy that doesn't contain their code.**
Worth fixing for real (re-linking the GitHub connection) before relying on it again — flagging
clearly rather than letting it look "just fine" because arena-web's webhook happens to work.

## Loose ends / things I'm not fully sure of

- **A pre-existing ID inconsistency, found while verifying FIX 1, not caused by it and not
  fixed**: `CandidateProfileResponse.id` (from `GET /profile/me`, and apparently whatever the
  enterprise Talent Universe search's candidate cards link with) is a *different* UUID than the
  same person's `User.id` (what `Post.authorUserId` uses, and what `/profile/{id}` actually
  expects). I hit this directly — the id I'd been using all session for "Aarav Sharma" resolved
  to "Candidate not found" on the newly-public endpoint until I sourced a fresh id from a real
  post's `authorUserId` instead. If the enterprise talent search's "View" link is meant to be
  cross-referenceable with a candidate's public profile, it may currently point at the wrong id
  space. Didn't chase this further — outside the 4 fixes, and I don't have enough context on
  which id space each of `EnterpriseProfile`'s candidate-search results is *supposed* to key on
  to be confident about which side is "wrong."
- **One commit is not pushed**: `arena-web`'s `PAGE-INVENTORY.md` update (marking findings #1-4
  FIXED) is committed locally but `git push` has hung on the Windows Git Credential Manager's
  interactive OAuth step 7+ times over ~15 minutes, never completing or erroring — the same
  known class of issue documented earlier in this project's history. This is documentation only;
  none of the actual fix commits are affected (both `arena-web`'s `8348ccf` and `arena-api`'s
  fix commits are confirmed on `origin/main` and deployed). Will need a retry, from either side.
- **`Arena-Page-Inventory.pdf` was not regenerated** — would need a fresh 65-route screenshot
  pass; deferred given the scope of this was "fix P0/P1," not "re-run the full audit." The
  markdown table is the accurate, up-to-date source; the PDF is now one pass behind it.
- **P2 items (findings #5-10) are untouched**, as instructed — non-semantic list-card links,
  the re-enterable onboarding form, undocumented routes, the stale HM doc note, wasted 403 calls
  before redirects, and the unresolved `/admin/tenants` detail view.

## Not done, on purpose

PART 15 was not touched. No refactors beyond what each fix needed.
