# BLOCKERS.md

Tasks stopped because they need Syam. Each entry: what's blocked, why, and the
exact ask.

---

## B1 — Retired Railway deployment still running, needs credential rotation

**Blocked:** Deleting/cleaning up the retired pre-rewrite Arena backend.

**Found:** A Railway project named `Vikisol-Arena` (distinct from the live
`arena-staging` project) contains a service `Vikisol-Arena-BE` whose deployment
is stopped, plus a **Postgres instance that is still running** and still
billable. No custom domain is attached to either.

**Ask for Syam:** Confirm this is safe to delete outright (it appears to be
exactly the "retired Arena deployment" already flagged in
ARENA-VNEXT-SESSIONS.md §8 as needing credential rotation before cleanup).
Whatever database credentials, API keys, or secrets that retired Postgres
instance and backend were issued need to be rotated **before** deletion, not
after — if anything still references those credentials, deleting the service
first would surface as a silent failure elsewhere instead of a clean rotation.
Once rotated, the whole `Vikisol-Arena` project can likely be deleted to stop
the ongoing Postgres billing.

Not deleted, not stopped further, not modified — left exactly as found.

---

---

## B2 — Sentry is rejecting every event in production

**Blocked:** Confirming whether production JS errors are actually reaching
anyone.

**Found:** Every single page load during the Phase 1 defect census (every
role, every route, including logged out) triggered a `403` from Sentry's own
ingest API for the configured DSN. Full detail in `FUNC-BUGS.md` (F3).

**Ask for Syam:** Check the Sentry project directly (dashboard access only —
not in this repo) for one of: a revoked/rotated DSN key that the deployed env
var no longer matches, a quota/rate-limit block on the project, or an
allowed-origins/allowed-domains restriction that doesn't include
`arena.vikisol.in`. Whichever it is, until it's fixed, Sentry is not a
reliable signal for anything in this repair pass — console-error evidence
gathered directly (as in `FUNC-BUGS.md`) should be trusted over an absence of
Sentry alerts.

Not modified — `NEXT_PUBLIC_SENTRY_DSN` was only read via `vercel env ls`
(names/existence, not values), never changed.

---

*(Further blockers get appended here as Phase 1/2 work surfaces them.)*
