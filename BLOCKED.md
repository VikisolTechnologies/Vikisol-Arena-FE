# BLOCKED.md — items waiting on external input

## ⚠️ Found existing live production infrastructure — please read
The `railway` CLI's pre-authenticated "Vikisol-Arena" project turned out to already have a
real, live, production Arena deployment in it (`Vikisol-Arena-BE` service, `SPRING_PROFILES_
ACTIVE=prod`, real Cloudinary/Google OAuth credentials, a webhook wired to the production
`vikisol-one-be-production.up.railway.app` backend, serving `https://arena.vikisol.in` /
`https://api-arena.vikisol.in`) — not an empty shell as assumed. This predates this session's
full rewrite and is almost certainly something the founder set up separately. **It was not
touched** (only read-only `railway status`/`railway variables` calls were made) — everything
in this file's staging-deploy section below happened in a brand-new, separately-named
`arena-staging` Railway project instead, created specifically to avoid any risk to that
existing service. Flagging this because it wasn't mentioned anywhere in this project's history
before now and the founder may want to know it's there (and decide what, if anything, should
happen to it — leave it, retire it, or fold this session's work into it later).

## GitHub push (arena-web + arena-api)
Neither repo is pushed anywhere yet — both are local-only. `gh` CLI is not installed in
this environment and no token has been provided, so I cannot create the remote repos
myself. Per the sprint rules, the moment a token or pre-created repo exists in this
session, both repos get pushed before anything else continues.

**What's needed** (either one):
- A GitHub Personal Access Token (repo scope) for the VikisolTechnologies org, or
- The two empty private repos created manually — `VikisolTechnologies/arena-web` and
  `VikisolTechnologies/arena-api` — with their URLs passed back.

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
