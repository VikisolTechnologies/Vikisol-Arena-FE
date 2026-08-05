# BLOCKED.md — items waiting on external input

## GitHub push — ✅ DONE (2026-08-06)
`arena-web` → `VikisolTechnologies/Vikisol-Arena-FE` (`main`, force-pushed over the old
history, all 4 tags through `v1.2-staging-live`). `arena-api` → `VikisolTechnologies/
Vikisol-Arena-BE` (`main`, same, 3 tags — `v0.1-fe-complete` is FE-only). Both confirmed via
git's own "forced update" push output. Step 1's guard rail is satisfied — Step 5 (retiring the
old deployments) is no longer blocked on this specifically, only on Step 4 (domain verified
live) still being pending.

Three fine-grained PATs failed first (`remote: Write access to repository not granted` twice,
then `remote: Permission ... denied to VikisolTechnologies` once) before a **classic** PAT
(`repo` scope) worked immediately — worth knowing if a token is ever needed here again:
fine-grained PATs for this org hit some access-attribution issue that classic tokens don't.
Every token was used transiently (embedded in the git remote URL only for the push, stripped
immediately after) and never written to a file, logged, or committed.

## Old deployment retirement (context for Step 5)
Syam has confirmed (ARENA-FINAL-CUTOVER.md's context + DATABASE GUARDRAIL sections) that the
existing arena.vikisol.in (Vercel, A-record → 76.76.21.21), api-arena.vikisol.in (old Railway,
`qzli904x.up.railway.app`), and its `vikisol-arena` Postgres have zero users/data and are
approved for deletion once the new build is confirmed live on the same domains — explicitly
NOT the `enchanting-vibrancy`/HRLMS production database, which is out of scope entirely. Both
app deletions are Syam-only actions (Claude can't reach Vercel's dashboard or delete a Railway
service outside this session's own project) — exact instructions will be issued at Step 5, once
Step 4 (domain verified live) also passes. GitHub push is no longer what's gating this.

## 🛑 api-arena.vikisol.in is already claimed by the OLD Railway service — Step 3 needs one of
## these from Syam before it can finish
`railway domain api-arena.vikisol.in --service arena-api` (the new one, in the fresh
`arena-staging` project) fails because that hostname is already an ACTIVE custom domain on the
**old** `Vikisol-Arena-BE` service in the pre-existing "Vikisol-Arena" project — Railway only
allows one active binding per hostname account-wide. This is functionally a Step 5 action
(releasing it stops the old service from being reachable on that domain), so it wasn't done
unilaterally even though this session's Railway login can technically reach that project too.

**Pick one:**
1. In the Railway dashboard, open the old **Vikisol-Arena** project → **Vikisol-Arena-BE**
   service → Settings → Networking, and remove the `api-arena.vikisol.in` custom domain. Say
   the word and this session will immediately claim it for the new service and hand back the
   CNAME target.
2. Explicitly tell this session to release it via the CLI directly (same access, just needs
   your go-ahead given it touches the pre-existing service).

`arena.vikisol.in` (the frontend) had no such conflict — Railway assigned it cleanly, see the
DNS instructions below.

## DNS changes needed from Syam (GoDaddy) — do these once api-arena.vikisol.in above is
## resolved; arena.vikisol.in can be done now
1. **Delete** the existing `arena` A record (currently → `76.76.21.21`, the old Vercel deploy).
2. **Add** a CNAME: name `arena` → **`55amzai3.up.railway.app`**
3. **Update** the `api-arena` CNAME (currently → `qzli904x.up.railway.app`, the old Railway
   service) → *[CNAME target pending — will follow the instant the domain conflict above is
   resolved]*.

Both are subdomains, so a CNAME is correct for each (no ALIAS/apex-record complication).
This session will wait for confirmation that DNS has changed and propagated before treating
`arena.vikisol.in`/`api-arena.vikisol.in` as live — Step 4's smoke test runs against them only
after that, not before.

## Staging deploy — ✅ DONE, no longer blocked
Live at https://arena-web-production-f1f4.up.railway.app (frontend, Basic Auth-gated) and
https://arena-api-production-a01d.up.railway.app (backend), in a fresh `arena-staging` Railway
project (Postgres + Redis + both app services). See TEST-LOGINS.md and SHIP-REPORT.md for
details, credentials, and what's verified. Remaining nice-to-haves, not blockers:
- A real custom domain (e.g. `arena-staging.vikisol.in`) instead of the `*.up.railway.app`
  ones — needs DNS access/a CNAME from the founder. Railway's own domain is fine for now.
- Object storage: CV uploads currently use `arena-api`'s local-disk `FileStorageService` on
  Railway's ephemeral filesystem — files are lost on every redeploy. Fine for a short-lived
  staging demo; swapping in Cloudinary (reuse HRLMS's account or a separate one) before this
  environment needs to persist uploads across redeploys is a one-class change, not a redesign.
- `SENTRY_DSN` is unset on both services (dormant, no-ops safely) — set it once a Sentry
  project exists to get real error tracking instead of just Railway's own logs.

## Phase 5 integration keys (scaffolding is built and dormant — arena-api boots and runs fully
## with zero configuration; these just need to be set as env vars whenever ready, no code
## changes required on either side)
- `RESEND_API_KEY` / `RESEND_FROM` (transactional email) — HRLMS-BE already has a Resend
  account in prod; decide whether to reuse it or provision separately. Blank today = the
  Noop email provider stays active (logs what it would have sent)
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` (Meta WhatsApp Cloud API) — not wired
  at any call site yet either way, so this is lower priority than the other two
- `TEAMS_TENANT_ID` / `TEAMS_CLIENT_ID` / `TEAMS_CLIENT_SECRET` / `TEAMS_ORGANIZER_EMAIL`
  (Azure AD app-only Graph creds, for real Teams meeting links replacing the current
  placeholder `https://meet.arena.dev/{id}` links) — HRLMS-BE has a working provider class
  for this exact pattern; needs its own fresh Azure AD app registration for Arena, separate
  from whatever HRLMS-BE has registered
