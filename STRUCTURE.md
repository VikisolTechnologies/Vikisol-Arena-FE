# STRUCTURE.md

ARENA-FIX-EVERYTHING.md Phase 1C — architectural debt, named. Everything here
was checked against current code/live infra this session, not inherited from
another document.

## The "two overlapping navigation shells" — narrower than expected

The mission brief's own hypothesis was that a `CandidateAppShell` and
`AppShell` still overlap, per `ROUTES.md`'s note (dated 2026-08-12, first line
of that file) that `/messages` was `CandidateAppShell`'s "last remaining
route." **Checked directly: `CandidateAppShell.tsx` does not exist anywhere in
the codebase**, and `/messages/page.tsx` imports `AppShell`, same as every
other consumer route. That migration finished; the doc just never got
updated. `ROUTES.md`'s header note and `AppShell.tsx`'s own top comment (which
still says "CandidateAppShell is untouched and still serves every route not
yet migrated") are both stale — worth a follow-up doc fix so a future session
(human or AI) doesn't go looking for a component that's gone.

**What genuinely exists, and isn't obviously wrong:** five distinct shells —
`AppShell` (consumer/talent), `EnterpriseAppShell`, `HiringManagerShell`,
`CompanyAdminShell`, `PlatformAdminShell`. These map to five different roles
with legitimately different navigation needs (hiring managers get a
deliberately restricted "lite workspace" per TEST-LOGINS.md), so this isn't
automatically duplication — it's not yet clear how much shared layout/chrome
logic is copy-pasted across them versus genuinely different. Not audited line
by line this pass; a real "are these five actually consistent with each
other" comparison is follow-up work.

## `ROUTES.md` describes a target state, not current reality

`ROUTES.md` is explicitly a migration-tracking document (its own header:
"tracks every route the master spec requires, against what actually exists").
Its "Deleted / redirected" table (`/enterprise/*` → `/workspace/*`,
`/rooms`/`/messages` → `/inbox`, `/identity` → `/me`, etc.) describes the
**planned v3 target**, not something already done — every one of those "old"
routes is still the live, real, only version of that page today (confirmed
via `next build`'s route manifest and by directly hitting them in the defect
census). Anyone reading only the table without the surrounding context would
reasonably conclude those routes are already gone. They aren't. Not fixing
the doc's structure here (it's meant to track a real in-flight migration,
which is out of scope for a repair-only pass) — just flagging so Phase 2/3
work doesn't get planned against routes that don't exist yet.

## `TEST-LOGINS.md` points at a dead Railway frontend URL

The doc's "Frontend: https://arena-web-production-f1f4.up.railway.app" no
longer resolves to anything (`curl -I` returns `404` with
`x-railway-fallback: true` — Railway's signal for "no service claims this
hostname," not an app-level 404). The real, current frontend is
`arena.vikisol.in` on Vercel — this URL is retired. The **backend** URL in the
same doc (`arena-api-production-a01d.up.railway.app`) is still correct — it's
the same live service as `api-arena.vikisol.in`, just addressed by its raw
Railway domain instead of the custom one. Doc drift again, not a functional
bug; worth a one-line fix to `TEST-LOGINS.md` removing the dead frontend URL.

## Retired Railway infrastructure still running

Covered fully in `GROUND-TRUTH.md` (§0.1) and `BLOCKERS.md` (B1): a separate
Railway project (`Vikisol-Arena`, distinct from the live `arena-staging`
project) has a stopped `Vikisol-Arena-BE` service and a **still-running**
Postgres instance. Structural debt in the sense that it's exactly the kind of
leftover a six-times-rebuilt product accumulates — flagged there rather than
duplicated here.

## The live API project is named `arena-staging`

Not a code defect, but worth naming explicitly since it will confuse the next
person who looks: the Railway project actually serving
`api-arena.vikisol.in` in production is called `arena-staging`. No functional
issue found from this — it's a real, correctly-configured production
deployment — but the name actively suggests the opposite of what it is. Purely
a Railway dashboard rename; not touched here since renaming infra wasn't asked
for and carries its own (small) risk of breaking something that keys off the
project name.

## `Vikisol-Arena-FE/railway.toml` is dead configuration

`arena.vikisol.in` is served by Vercel (confirmed in `GROUND-TRUTH.md`), not
Railway, and no Railway project across the four this account has access to
runs an `arena-web`-named service. The `railway.toml` + `Dockerfile` in this
repo's root appear to be leftover from an earlier hosting attempt (or kept as
a deliberate fallback path never exercised). Not deleted this pass — deleting
infra config that might be an intentional disaster-recovery fallback is a
real decision, not a repair, so it's named here rather than acted on.
