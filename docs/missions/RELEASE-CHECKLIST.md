# Release checklist — Arena B+, real backend

**Status: NOT release-ready.** See "What's not done" below. This is the honest state after
`MARATHON-FE` (2 Oct 2026), written so the next session can pick up exactly where this one
stopped rather than re-deriving it.

## Branch
`feature/arena-vnext-mobile-jenny` → `main` (frontend `Vikisol-Arena-FE`). Commits made this run
are **local only** — `git push` failed on every attempt (`Failed to connect to github.com port
443`), checked repeatedly across the whole run, never looping on it per the mission's own rule.
**The branch must be pushed before anything below matters** — ask whoever has network back first.

## Vercel Production env vars (when the architect says release-ready and the founder gives the OK)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_ARENA_DATA` | `api` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-arena.vikisol.in/api/v1` |

No other variable changes `api` vs `mixed` behaviour; Google Sign-In/Maps keys are independent
and already documented in `.env.local.example`. The backend goes first, then the frontend, per
the inbox's release rule — the architect confirms the backend deploy before either env var is set.

## What works end to end (verified this run, mostly live against the local backend, not just by
reading source)
- **Auth & onboarding (area 1):** sign up (now collects date of birth, backend-enforced 18+),
  sign in, refresh, sign out, the onboarding age gate (skips itself when sign-up already
  collected a DOB), full onboarding answers persisting for real.
- **Profile & settings (area 2):** visibility, notification preferences, report a person, account
  export/delete.
- **Activities (area 3b):** the full `/activities/*` lifecycle — create (real kinds), structured
  details, cover upload, host questions, join with answers, approve, self/host check-in,
  attendance, confirm/dispute, feedback. Verified live with two real accounts end to end.
- **Needs & offers (area 4):** respond, accept/decline (opens a real private conversation, not a
  post room), withdraw, mark completed. **This area was silently broken against the real backend
  before this run** (`post.myJoinStatus` is always empty for ASK/OFFER posts) — now fixed.
- **Search (area 5):** people/skills search now calls the real endpoint instead of a hardcoded
  "coming soon".
- **Career (area 6):** CTC per-application sharing (off by default), offer accept/decline wired
  (shapes verified against the controller, not live-tested — no seeded jobs in the local DB to
  reach the `offer` stage through a full pipeline).
- **Business pipeline (area 7, partial):** the two always-failing moves ("Mark as hired" from the
  company side, "Reconsider" on a rejected application) are removed; the stage dropdown now only
  offers real moves.
- **Admin & account (area 8):** account was already real (area 2); platform admin paths audited
  by inspection against the controller, not re-verified live this run.
- **Jenny (area 9):** every v2 feature (rows 42–47) already showed, or now provably shows, its
  own honest "can't do this yet" state — confirmed by rewriting the 7 tests that used to assert
  the old fixture behaviour.

## What's "not available yet" (by design, per M6's own rule — no fake data in its place)
- Jenny's v2 features (sentence-to-filters, the approval queue, smart match, job-search
  automation, shortlist) — the JennySol v1 gateway doesn't expose them; each screen says so.
- Company domain-email verification (`POST/GET /enterprise/verification`) — **no frontend code
  calls it at all**. This is a real feature to build, not a quick fix; logged here rather than
  rushed.
- Full area 7 (company onboarding end-to-end, interviews, messages, connect requests, unlock
  credits, billing) and area 8's admin screens beyond what's listed above weren't re-verified
  live this run — audited by reading the controllers and FE code side by side, not clicked
  through with two real accounts.

## What's not done (Step 8, dummy-data removal)
**Not attempted this run.** `src/lib/mock/*`, `src/lib/preview-off/*`, `src/lib/data/fixtures.ts`,
the mock branches in `src/lib/api/*` (`mockNameFor` etc.), the `/dev/*` fixture routes and the
people fixtures in `public/fixtures/` are all still in the tree. Removing them mechanically,
across dozens of files, without the remaining time in this run to verify each one still builds
and behaves correctly afterward, risked leaving the branch in a worse state than it's in now —
fully buildable, with mock mode cleanly gated behind `isRealMode()`/`FIXTURES_ALLOWED` (the same
flag `next.config.ts`'s production guard already refuses to ship fixtures under). Deliberate
decision, not an oversight: a focused future session should do this as its own pass, verifying
`grep -rn "lib/mock\|preview-off\|fixtures\|isRealMode" src` down to nothing (or the single
data-mode guard) and a full suite + build run at the end, not partway through.

## Open `API-ISSUES.md` entries
**None.** All four entries on file are marked FIXED or CLOSED (closed ones were FE path errors,
not backend gaps).

## Verified this run (every step)
`npx tsc --noEmit`, `eslint` on every changed file, and
`VERCEL_ENV=production NEXT_PUBLIC_ARENA_DATA=api NEXT_PUBLIC_API_BASE_URL=https://api-arena.vikisol.in/api/v1 npm run build`
all green after every commit, per the mission's own "stay production-buildable" rule. Full local
suite not run as one single pass at the very end (budget); every area's own targeted tests were
run and are green as of their commit (see `REPORTS.md`'s step-by-step entries).

## Draft PR
Not opened this run — `git push` never succeeded (see above), and a PR can't be opened for
commits GitHub doesn't have yet. **Next step once push succeeds:** open a draft PR
`feature/arena-vnext-mobile-jenny` → `main` titled "Arena B+ — first real-backend release" (do
not merge), listing this file as the review starting point.
