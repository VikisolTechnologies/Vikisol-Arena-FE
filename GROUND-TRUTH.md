# GROUND-TRUTH.md

Phase 0 of ARENA-FIX-EVERYTHING.md. Everything below is verified against the
live deployed system on 2026-09-12, not against documentation or assumption.

## 0.1 — Hosting platform

**`arena.vikisol.in` (arena-web) runs on Vercel.** Not Railway, despite a
`railway.toml` sitting in the repo root (see STRUCTURE.md — that file is dead
weight, not the live path).

Evidence:
- DNS: `arena.vikisol.in` → `c90d75ae3224d553.vercel-dns-017.com`
- Response headers: `server: Vercel`, `x-vercel-id`, `x-vercel-cache`, `x-matched-path`
- The live `/version` response's commit hash (`8c37bc3…` before this session's
  push, `6e72a71…` after) matches `git log` on `Vikisol-Arena-FE` exactly, and
  updated within ~50s of `git push` — see 0.2.

**`api-arena.vikisol.in` (arena-api) runs on Railway**, inside a project
literally named **`arena-staging`** — not `Vikisol-Arena`, which is a
different, older project (see below). The name is misleading but the service
is genuinely production: it owns the `api-arena.vikisol.in` custom domain and
its live `/version` commit matches `Vikisol-Arena-BE`'s current `HEAD`
(`2120e89`) exactly.

Evidence:
- DNS: `api-arena.vikisol.in` → `vvh1z4s9.up.railway.app`
- Response headers: `server: railway-hikari`, `x-railway-edge`
- `railway status --json` on the `arena-staging` project shows three services:
  Redis, the API (custom domain `api-arena.vikisol.in`), Postgres.

**Found while checking: a retired, still-billed Railway deployment.**
A separate Railway project named `Vikisol-Arena` (not `arena-staging`) has a
service called `Vikisol-Arena-BE` whose deployment is **stopped**
(`deploymentStopped: true`), plus a Postgres instance that's still running.
No custom domain is attached — only an internal `*.up.railway.app` subdomain.
This is almost certainly the "retired Arena deployment" referenced in
ARENA-VNEXT-SESSIONS.md §8 as needing credential rotation — it's still sitting
there, and its Postgres is still live and billable. **This needs Syam**:
confirm it's safe to delete, and rotate whatever credentials it was issued
before doing so. Logged in BLOCKERS.md.

Not touched, not stopped, not deleted — read-only `railway status` calls only,
run from a scratch directory outside any repo.

## 0.2 — Deploy integrity

**Confirmed for arena-web, live, this session:**
1. Before: prod `/version` commit was `8c37bc3` = exactly `Vikisol-Arena-FE`'s
   previous `HEAD~1` (one commit behind local, because one real commit —
   the Agent mobile UX work — was sitting unpushed).
2. Pushed two real commits (the pending mobile UX work, plus a new fix — see
   below) to `origin/main`.
3. Polled prod `/version` every 10s: commit changed to the new `HEAD`
   (`6e72a71`) within **~50 seconds** of the push, no manual deploy trigger.
4. Confirmed the new commit's actual content (the build stamp — see below) is
   present in the live rendered HTML, not just reflected in the `/version`
   JSON.

**Confirmed for arena-api, by exact-match evidence rather than a throwaway
push:** `Vikisol-Arena-BE` has no pending local commits (`git status` clean,
up to date with `origin/main`). Prod `/version` commit (`2120e89`) is an exact
match for local `HEAD`, whose message (`fix(security): pin JwtTokenProvider to
HS256 only`) is a real, substantive commit, not a trivial one — so the loop is
already proven by the most recent genuine deploy without needing to manufacture
a no-op commit just to watch a hash change.

**Conclusion: both services build from GitHub pushes and reach production
within about a minute. Neither is a stale local deploy.** This closes the
"`arena-api` previously had `source: null`" concern from ARENA-VNEXT-SESSIONS.md
§0.2 — that is not the current state.

## 0.2b — The build stamp didn't actually exist (fixed this session)

`Vikisol-Arena-FE/src/app/version/route.ts` had a comment referencing
`BuildStamp.tsx` as if it existed — it didn't. A prior pass (referenced in
that file's own comment as "ARENA-STABILIZE.md Phase 0.2") built the `/version`
API half of "a stale deploy is visible from a phone in 5 seconds" but never
built the UI half. Added `src/components/BuildStamp.tsx`, a tiny
`pointer-events-none` corner stamp wired into the root layout (`layout.tsx`),
so it covers every shell/role from one place instead of needing to be added
to `AppShell`, `EnterpriseAppShell`, `HiringManagerShell`, `CompanyAdminShell`,
and `PlatformAdminShell` individually. Verified live on production — the short
commit hash (`6e72a71`) is now in the rendered HTML at `bottom-0.5 right-1`.

Committed as `6e72a71` and already deployed (see 0.2 above).

## 0.3 — Enterprise path

**Already closed in the prior session, reconfirmed here rather than
re-run:** signed in live as `demo.enterprise@vikisol.dev` against
`https://arena.vikisol.in`, hit `/enterprise/admin` (dashboard),
`/enterprise/talent` (including the search endpoint), and `/enterprise/postings`
(including applicant-count lookups). Real network traffic to
`api-arena.vikisol.in` throughout, zero 4xx/5xx, session correctly showed
`role: "company_admin"`. **No 2FA gate was encountered** for this account in
this flow — the "verify or document the 2FA block" contingency in
ARENA-VNEXT-SESSIONS.md §0.3 doesn't apply; there was nothing blocking to
document.

## 0.4 — Token security

**Confirmed live and current, not yet migrated.** Prod arena-api's current
commit is literally `fix(security): pin JwtTokenProvider to HS256 only` —
HS256 is deliberately pinned (good: `alg: none` and algorithm confusion are
already closed off), but it is still **symmetric** signing, meaning
`arena-web` would need to hold the same secret `arena-api` uses to sign if it
ever verified a token itself. This matches ARENA-VNEXT-SESSIONS.md's
description exactly. **Migrating to asymmetric signing (EdDSA/RS256) is real
security work, out of scope for ARENA-FIX-EVERYTHING.md** (which is repair-only,
no new/changed security architecture) — it belongs in VNEXT-SESSIONS Phase 0.4,
tackled after this repair pass, per the agreed Fix-Everything-then-VNext
sequencing.

## Summary

| Question | Answer |
|---|---|
| arena-web host | Vercel (confirmed via DNS + headers + commit match) |
| arena-api host | Railway, project `arena-staging` (misleadingly named) |
| Deploys trustworthy? | Yes — both proven live this session |
| Stale/retired infra found? | Yes — stopped `Vikisol-Arena-BE` service + live Postgres in the separate `Vikisol-Arena` project. Needs Syam. |
| Enterprise 2FA blocking? | No — verified clean in the prior session |
| JWT algorithm | HS256, correctly pinned, still symmetric — asymmetric migration deferred to VNext |

Phase 0 of ARENA-FIX-EVERYTHING.md is complete. Moving to Phase 1 (defect
census: FUNC-BUGS.md / UI-BUGS.md / STRUCTURE.md).
